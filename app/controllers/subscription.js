import Ember from "ember";
import config from "../config/environment";

function run(func) {
  if (func) {
    func();
  }
}

export default Ember.Controller.extend({
  socket: null,
  lastOnline: Date.now(),
  deviceTtl: 0,
  deviceId: Math.random().toString().substring(2),
  // logger: Ember.inject.service(),
  status: {
    online: false
  },

  updateStatus: Ember.observer('socket', function () {
    var socket = this.get("socket");
    var online = navigator.connection ? navigator.connection.type !== "none" : navigator.onLine;
    online = socket && socket.connected && online;
    this.set("status", {"online": online});
  }),

  // resync if offline longer than deviceTtl
  checkdeviceTtl: Ember.observer('status.online', function () {
    var online = this.get("status.online");
    var deviceTtl = this.get("deviceTtl");
    if (online && deviceTtl !== 0 && (Date.now() - this.get("lastOnline")) > deviceTtl * 1000) {
      this.resync();
    } else if (online === false) {
      this.set("lastOnline", Date.now());
    }
  }),

  initController: Ember.on('init', function() {
    var updateStatus = Ember.run.bind(this, this.updateStatus);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
  }),

  actions: {
    wire() {
      var updateStatus = Ember.run.bind(this, this.updateStatus);
      var connectUrl = config.APP.SOCKETIO_WEBSERVICE_URL +
        "?token=" + encodeURIComponent(this.session.get("authToken")) +
        "&deviceId=" + this.get("deviceId") +
        "&meta=appName:" + config.APP.NAME;
        // pass mutilple meta values by seperating '|' like this
        // "&meta=appName:" + config.APP.NAME +"|version:" + config.APP.NAME;

      var socket = io(connectUrl, {autoConnect:false,forceNew:true});
      this.set("socket", socket);
      socket.on("connect", function() {
        updateStatus();
        socket.io.engine.on("upgrade", updateStatus);
      });
      socket.on("disconnect", updateStatus);
      socket.on("error", Ember.run.bind(this, function(reason) {
        // ignore xhr post error related to no internet connection
        if (typeof reason !== "object" || reason.type !== "TransportError" && reason.message !== "xhr post error") {
          // this.get("logger").error(reason);
        }
      }));

      socket.on("update_store", Ember.run.bind(this, this.update_store));
      socket.on("_batch", Ember.run.bind(this, this.batch));
      socket.on("_resync", Ember.run.bind(this, this.resync));
      socket.on("_settings", Ember.run.bind(this, function(settings) {
        this.set("deviceTtl", settings.device_ttl);
        this.set("lastOnline", Date.now());
      }));
      socket.connect(); // manually connect since it's not auto-connecting if you logout and then back in
    },
  },

  batch: function(events, success) {
    events.forEach(function(args) {
      var event = args[0];
      this[event].apply(this, args.slice(1));
    }, this);

    run(success);
  },

  resync: function() {
    this.get("store").findAll("package");
  },

  // each action below is an event in a channel
  update_store: function(data, success) {

    var type = Object.keys(data.item)[0];
    var item = Ember.$.extend({}, data.item[type]);
    this.store.normalize(type, item);

    var existingItem = this.store.peekRecord(type, item.id);
    var hasNewItemSaving = this.store.peekAll(type).any(function(o) { return o.id === null && o.get("isSaving"); });
    var existingItemIsSaving = existingItem && existingItem.get("isSaving");
    if (data.operation === "create" && hasNewItemSaving || existingItemIsSaving) {
      run(success);
      return;
    }

    var cartContent = this.get('cart.content');
    var packageId = data.item.package.id;
    var cartItem = cartContent.filterBy("modelType", "package").filterBy("id", packageId.toString()).get("firstObject");

    if (["create","update"].includes(data.operation)) {
        this.store.pushPayload(data.item);

        var unDispatchedPkg = [];
        if(cartContent) {
          var pkge = this.store.peekRecord('package', data.item.package.id);
          if(pkge.get('stockitSentOn') && pkge.get('hasSiblingPackages')){
            var pkgs = pkge.get('item.packages');
            pkgs.forEach(function(record) {
              if(!record.get('stockitSentOn')) {
                  unDispatchedPkg.push(record);
                }
            });
          }
          if(unDispatchedPkg.length === 1) {
            this.get("cart").removeItem(pkge.get('item'));
            this.get('cart').pushItem(unDispatchedPkg.get('firstObject').toCartItem());
          }
        }

        if(cartItem) {
          var pkg = this.store.peekRecord("package", packageId);
          this.get("cart").pushItem(pkg.toCartItem());
        }

    } else if (existingItem) { //delete
      this.store.unloadRecord(existingItem);

      if(cartItem) {
        Ember.set(cartItem, "available", false);
        this.get("cart").pushItem(cartItem);
      }
    }

    run(success);
  }
});

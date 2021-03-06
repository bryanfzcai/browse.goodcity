import Ember from 'ember';
import '../computed/local-storage';

const {
  get,
  getOwner,
  ArrayProxy,
  computed,
  observer
} = Ember;

const Service = ArrayProxy.extend({

  localStorage: true,
  checkout: Ember.computed.localStorage(),
  store: Ember.inject.service(),

  content: computed(function(){
    return JSON.parse(window.localStorage.getItem('cart') || "[]");
  }),

  cartItems: computed('[]', '@each.available', function() {
    var content = this.get("content");
    var allItems = [];
    content.forEach(record => {
      if(record.available) {
        allItems.push(this.get("store").peekRecord(record.modelType, record.id));
      }
    });
    return allItems;
  }),

  currentCartItem(item) {
    let cartItem;

    if (item && item.toCartItem) {
      cartItem = item.toCartItem();
    } else {
      cartItem = getOwner(this)._lookupFactory('model:cart-item').create();
      cartItem.setProperties((item && item.toJSON && item.toJSON()) || item);
    }
    return cartItem;
  },

  hasCartItem(item) {
    let cartItem = this.currentCartItem(item);
    return this.findBy('guid', get(cartItem, 'guid'));
  },

  pushItem(item) {
    let cartItem = this.currentCartItem(item);
    let foundCartItem = this.findBy('guid', get(cartItem, 'guid'));
    if (!foundCartItem) {
      this.pushObject(cartItem);
    } else {
      this.removeItem(foundCartItem);
      this.pushObject(cartItem);
    }
  },

  cartItemProperties: ['guid', 'id', 'modelType', 'name', 'imageUrl', 'thumbImageUrl', 'available'],

  payload() {
    return this.map((item) => {
      return (item.getProperties && item.getProperties(this.cartItemProperties)) || item;
    });
  },

  removeItem(item) {
    let cartItem = this.currentCartItem(item);
    let foundCartItem = this.findBy('guid', get(cartItem, 'guid'));
    if (foundCartItem) {
      this.removeObject(foundCartItem);
    }
  },

  clearItems() {
    this.clear();
  },

  total: computed('@each.total', function() {
    return this.reduce(function(total, item) {
      return total + get(item, 'total');
    }, 0);
  }),

  isEmpty: computed.empty('content'),
  isNotEmpty: computed.not('isEmpty'),

  counter: computed.alias('length'),

  _dumpToLocalStorage: observer('[]', function() {
    if (this.localStorage) {
      window.localStorage.setItem('cart', JSON.stringify(this.payload()));
    }
  })
});

Service.reopenClass({
  isServiceFactory: true
});

export default Service;

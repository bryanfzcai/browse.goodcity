import Ember from 'ember';

export default Ember.Controller.extend({
  
  messageBox: Ember.inject.service(),
  application: Ember.inject.controller(),
  queryParams:    ['categoryId', 'sortBy'],
  categoryId:     null,
  sortBy:         "createdAt",
  item:           Ember.computed.alias('model'),
  noNextItem:     Ember.computed.empty('nextItem'),
  noPreviousItem: Ember.computed.empty('previousItem'),
  hideThumbnails: Ember.computed.gt('item.sortedImages.length', 1),
  smallScreenPreviewUrl: Ember.computed.alias('item.displayImage.smallScreenPreviewImageUrl'),

  direction: null,

  hasQuantityAndIsAvailable: Ember.observer('item.quantity', 'item.isAvailable', function() {
    if(!this.get('item.isAvailable') || !this.get('item.quantity')) {
      this.get('messageBox').alert('Sorry! This item is no longer available.',
      () => {
        this.transitionTo('/browse');
      });
    }
  }),

  hasDraftOrder: Ember.computed.alias("session.draftOrder"),

  presentInCart: Ember.computed('item', 'cart.counter', function(){
    return this.get('cart').hasCartItem(this.get('item'));
  }),

  allPackages: Ember.computed('item.packages.@each.isAvailable', function(){
    var item = this.get("item");
    return item.get("isItem") ? item.get('packages').filterBy("isAvailable") : [item];
  }),

  categoryObj: Ember.computed('categoryId' ,function(){
    return this.store.peekRecord('package_category', this.get("categoryId"));
  }),

  selectedSort: Ember.computed('sortBy' ,function() {
    return [this.get("sortBy")];
  }),

  sortedItems: Ember.computed.sort("categoryObj.items", "selectedSort"),

  nextItem: Ember.computed('model', 'sortedItems.[]' ,function(){
    var currentItem = this.get('item');
    var items = this.get("sortedItems").toArray();
    return items[items.indexOf(currentItem) + 1];
  }),

  previousItem: Ember.computed('model', 'sortedItems.[]' ,function(){
    var currentItem = this.get('item');
    var items = this.get("sortedItems").toArray();
    return items[items.indexOf(currentItem) - 1];
  }),

  previewUrl: Ember.computed("item.previewImageUrl", {
    get() {
      return this.get("item.previewImageUrl");
    },
    set(key, value) {
      return value;
    }
  }),

  actions: {
    showPreview(image) {
      this.set('previewUrl', image.get("previewImageUrl"));
    },

    setDirectionAndRender(direction) {
      this.set('direction', direction);
      var targetItem = direction === "moveRight" ? this.get("previousItem") : this.get("nextItem");

      if(targetItem) {

        if(targetItem.get("isItem")) {
          this.transitionToRoute('item', targetItem,
            { queryParams: {
              sortBy: this.get("sortBy"),
              categoryId: this.get("categoryId") }
            }
          );
        } else {
          this.transitionToRoute('package', targetItem,
            { queryParams: {
              sortBy: this.get("sortBy"),
              categoryId: this.get("categoryId") }
            }
          );
        }

      }
    },

    requestItem(item) {
      this.get('cart').pushItem(item);
      Ember.run.later(this, function() {
        this.get('application').send('displayCart');
      }, 0);
    },

    removeItem(item) {
      this.get('cart').removeItem(item);
    }

  }
});

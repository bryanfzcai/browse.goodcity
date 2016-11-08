import Ember from 'ember';
import PublicRoute from './browse_pages';

export default PublicRoute.extend({
  messageBox: Ember.inject.service(),
  isPublished: null,
  transition: null,
  model(params, transition) {
    var pkg = this.store.peekRecord('package', params["id"]);
    if(!pkg) {
      this.set('isPublished', false);
      this.set('transition', transition);
    } else {
      this.set('isPublished', true);
    }
    return pkg;
  },

  renderTemplate() {
    this.render('item', {controller: 'package'});
  },

  setupController(controller, model){
    controller.set('model', model);
    controller.set('item', model);
    controller.set("previewUrl", model.get("previewImageUrl"));
    this.controllerFor('application').set('pageTitle',
      this.get('i18n').t("itemdetail.view"));
  },

  afterModel() {
    if(!this.get('isPublished')) {
      this.get('transition').abort();
      this.get('messageBox').alert('Sorry! This item is no longer available.',
        () => {
          this.transitionTo('/browse');
        });
    }
  }
});

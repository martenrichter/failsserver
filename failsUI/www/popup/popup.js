/*
 * Copyright (C) 2013-2015 Intel Corporation. All rights reserved.
 */
/*global uib_jqm_popup */

(function($) {
  'use strict';

  window.uib_jqm_popup = window.uib_jqm_popup || {};

  /**
   * @exports uib_jqm_popup.open(jQuery, Object)
   */

  /**
   * Open a jQuery Mobile popup widget
   *
   * @param {jQuery} $popup: a single popup widget
   * @param {Object} opts: options to pass
   */
  uib_jqm_popup.open = function($popup, opts) {
    opts = opts || {};

    var state = (!opts.state || opts.state === 'toggle') ?
      ($popup.parent().hasClass('ui-popup-active') ? 'close' : 'open') :
      opts.state;

    $popup.popup(state);
  };

  $(function() {
    // regex used to split trigger into target
    var re = new RegExp(/([^/]*)\/(\S*)/g);
    var prefix = 'popup-';

    // trigger actions depend on trigger mode: toogle or boolean
    var fn_map = {
      'popup-togl': uib_jqm_popup.open,
      'popup-bool': uib_jqm_popup.open
    };

    // 'popup-togl/uib_w_1' => { mode: 'popup-togl', uib_id: 'uib_w_1' }
    var get_trigger_target = function(trigger) {
      if (trigger.indexOf(prefix) !== 0) { return null; }
      var match = re.exec(trigger);

      return !!match ? {
        mode: match[1].trim(),
        uib_id: match[2].trim()
      } : null;
    };

    $('[data-trigger]').each(function() {
      var $trigger = $(this);
      var trigger = $trigger.attr('data-trigger');
      var target = get_trigger_target(trigger);

      var proceed_f = function(target) {
        if (!target) { return; }

        var $popup = $('.' + target.uib_id);
        if ($popup.length) {
          var fn = fn_map[target.mode];

          var opts = {}; // pull options off of the trigger and/or target
          $trigger.on('click', function() { fn($popup, opts); });
        }

        // next matching trigger
        var next_target = get_trigger_target(trigger);
        proceed_f(next_target);
      };

      // kick off
      proceed_f(target);
    });
  });

})(window.jQuery);

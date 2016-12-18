/**
 * PENTAPOSTS logs last five posts of every user
 * Copyright Peter Maggio 2016
 * Do not redistribute
 */
 if ( typeof vitals == "undefined" ) {
    window.vitals = {};
 }
class pentaposts {
   /**
    * Constructor function
    * Sets up settings, accrues info, and kicks init function
    */
   constructor ( ) {
      // key
      this.key = pb.plugin.key('pentaposts');

      // plugin
      this.plugin = pb.plugin.get('the_last_pentaposts');

      // USER SETTINGS
      this.settings = {};
      this.settings.preview_length = this.plugin.settings.preview_length;
      this.settings.excluded_boards = this.plugin.settings.excluded_boards;
      this.settings.excluded_categories = this.plugin.settings.excluded_categories;
      this.settings.excluded_members = this.plugin.settings.excluded_members;
      this.settings.post_html = this.plugin.settings.post_html;

      // INFO
      this.info = {};
      this.info.is_post_page = yootil.form.post().length > 0;
      this.info.is_thread = yootil.form.quick_reply().length > 0;
      this.info.is_edit = pb.data('route').name.split('_')[0].toUpperCase() == "EDIT";
      this.info.user = pb.data('user').id; // Either the user browsing or the profile being used
      this.info.curr_board = ( pb.data('page').board != undefined )? pb.data('page').board.id: -1;
      this.info.curr_category = ( pb.data('page').category != undefined )? pb.data('page').category.id: -1;
      this.info.curr_board_excluded = ( this.settings.excluded_boards != undefined )? ( this.settings.excluded_boards.indexOf(this.info.curr_board) > -1 ):false;
      this.info.curr_category_excluded = ( this.settings.excluded_categories != undefined )? (this.settings.excluded_categories.indexOf(this.info.curr_category) > -1):false;
      this.info.curr_user_excluded = ( this.settings.excluded_users != undefined )? (this.settings.excluded_users.indexOf(this.info.user) > -1):false;

      // KICK
      this.init();
   }
   /**
    * Starts the magic
    */
   init ( ) {
      if ( ( this.info.is_post_page || this.info.is_thread ) && !this.info.is_edit && !( this.info.curr_board_excluded || this.info.curr_category_excluded || this.info.curr_user_excluded ) ) {
         this.watch_post();
         this.watch_delete_button();
      } else if ( $('#thepentashelf').length > 0 && pb.data('route').name.toUpperCase() == 'USER' ) {
         this.fill_shelf(pb.data('route').params.user_id);
      } else if ( pb.data('route').name.toUpperCase() == "RECENT_POSTS" && this.getURLParameter('post') != null ) {
         this.slide_to_post( this.getURLParameter('post'));
      } else if ( this.settings.post_html.match(/\$\[apentapost\]/gi).length != 1 || this.settings.post_html.match(/\$\[apentadelete\]/gi).length != 1 ) {
         pb.alert('The Last Pentaposts requires that $[apentapost] and $[apentadelete] be present in the post html. Please contact an administrator.');
         return;
      } else {
         return;
      }
   }

   /**
    * Trims the length of the string given a max length; trims on nearest whitespace
    *
    * @param   {string}    str         The string to be trimmed
    * @param   {integer}   max_legnth  The maximum length of the string to be returned
    * @return  {string}    str         The trimmed string
    */
   trim_length ( str, max_length = 750 ) {
      str = str.slice(0, max_length - 1);
      if (str.length == max_length - 1)
         str = str.slice(0, str.lastIndexOf(' ')) + '...';
      return str;
   }

   /**
    * Gets a specified perameter value from the URL
    *
    * @param  {name}    name  The parameter name you wish to get
    * @return {string}        The value of the specified perameter
    * @source http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
    */
   getURLParameter ( name ) {
     return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
   }

   /**
    * Removes bbcode tags from strings
    *
    * @param   {string}    str   The string to remove the bbcode tags from
    * @return  {string}    str   The simplified string
    */
   remove_bbcode ( str ) {
      str = str.replace(/\[\/?(b|i|p|u|s|em|div|sub|sup|font|span|strong)(\s+.*?)?\]/gim, "").replace(/\[br\]/gi, ""); // PB source code
      str = str.replace(/\[\/?(a|strike|img|video|code|quote|facebook|twitter|gplus|linkedin|pinterest|vine|spotify|instagram|indiego|kickstarter)(\s+.*?)?\]/gim, "");
      str = str.replace(/\n/, '');
      return str;
   }

   /**
    * Removes common proboards post html tags from strings
    *
    * @param   {string}    str   The string to remove the html tags from
    * @return  {string}    str   The simplified string
    */
   remove_html ( str ) {
      str = str.replace(/<\/?(b|i|p|u|s|em|div|sub|sup|font|span|strong)(\s+.*?)?>/gim, "").replace(/<br(\s?\/)?>/gi, ""); // PB source code
      str = str.replace(/\n/, '');
      return str;
   }

   /**
    * Gets contents of quick_reply and reduces to specified length
    *
    * @param   {integer}   max_length     The maximum length of the string
    * @return  {string}    text           The text in the quick reply box
    */
   quick_reply ( max_length = 750 ) {
      let text = yootil.form.quick_reply().find('textarea').val();
      text = this.remove_bbcode(text);
      text = this.trim_length(text, max_length);
      return text;
   }

   /**
    * Gets the contents of the wysiwyg editor or the bbcode editor
    *
    * @param   {integer}   max_length     The maximum length of the string to be returned
    * @return  {string}    text           The text in the wysiwyg editor or bbcode editor
    */
   post ( max_length = 750 ) {
      let wysiwyg = $('.wysiwyg-textarea').data('wysiwyg');
      let text = '';
      switch(wysiwyg.currentEditorName) {
         case "visual":
            text = wysiwyg.editors.visual.getContent();
            text = this.remove_html(text);
            text = this.trim_length(text, max_length);
            return text;
         case "bbcode":
            text = wysiwyg.editors.bbcode.getContent();
            text = this.remove_html(text);
            text = this.trim_length(text, max_length);
            return text;
         default:
            console.error('No wysiwyg feature found.');
      }
   }

   /**
    * Intercepts a post before its sent
    *
    * @return  {string}    The intercepted text
    */
   intercept_post ( ) {
      if ( this.info.is_post_page ) {
         return this.post(this.settings.preview_length);
      } else if ( this.info.is_thread ) {
         return this.quick_reply(this.settings.preview_length);
      } else {
         console.error('No post form found.');
      }
   }

   /**
    * Watches submit button and kicks intercept when form is submitted
    */
   watch_post ( ) {
      let _that = this;
      yootil.form.any_posting().each(function(){
         $(this).find('[type="submit"]').mousedown(function(){
            let packet = _that.intercept_post();
            _that.send(packet);
         });
      });
   }

   /**
    * Saves post in user key
    */
   send ( packet ) {
      let keyLen = ( this.key.get(this.info.user) != undefined)? this.key.get(this.info.user).length: -1;
      if ( keyLen == -1 ) {
         this.key.set({ object_id: this.info.user, value: []});
      }
      if ( keyLen >= 5 ) {
         his.key.pop({ object_id: this.info.user, num_items: keyLen - 4 });
      } else {
         this.key.unshift({ object_id: this.info.user, value: packet });
      }
   }

   /**
    * Fills div with posts based on user supplied HTML
    *
    * @param   {number}    user  The id of the user to fill the shelf with
    */
   fill_shelf ( user ) {
      const html = this.settings.post_html ;
      const thePentaposts = this.key.get(user);
      for ( let i in thePentaposts ) {
         let tmp = html.replace(/\$\[apentapost\]/gi, thePentaposts[i] + '<a href="' + location.href + '/recent?post=' + i + '"> View Post</a>');
         if ( this.info.user == pb.data('user').id || pb.data('user').is_staff ) {
            tmp = tmp.replace(/\$\[apentadelete\]/gi, '<a href="javascript:;" onclick="vitals.pentaposts.delete_cached_post(' + ( parseInt( i ) + 1 ) + ')">Delete</a>');
         } else {
            tmp = tmp.replace(/\$\[apentadelete\]/gi, '');
         }
         $('#thepentashelf').append(tmp);
      }
   }

   /**
    * Slides to specified post on the recent threads page
    *
    * @param   {number}    post_number    The number of post to slide to (1 is first post on the page, 2 is second post on the page, etc.)
    */
   slide_to_post ( post_number ) {
      $('html, body').animate({
          scrollTop: $('.item.post:nth(' + post_number + ')').offset().top
      }, 100);
   }

   /**
    * Deletes the post at the specified index
    *
    * @param   {number}    index    The number of the post to delete (1-5)
    */
   delete_cached_post ( index ) {
      let keyLen = ( this.key.get(this.info.user) != undefined)? this.key.get(this.info.user).length: -1;
      if ( index > 5 || index > keyLen || this.key.get(this.info.user) == undefined )
         return false;
      else {
         let poparuski = this.key.pop({object_id: this.info.user, num_items: keyLen - index + 1});
         poparuski.shift();
         this.key.push({
            object_id: this.info.user,
            values: poparuski,
            success:(function(){
               location.reload();
            })
         });
      }
   }

   /**
    * Watches for posts to be deleted and reminds the user to delete the cache as well
    */
   watch_delete_button ( ) {
      let _that = this;
      $('[class$="deletePost"]').click(function(){
         let user = $( $(this).attr('class').split('-') )
         window.setTimeout(function(){
            pb.window.dialog('pre-delete-warn', {
               title: 'The Pentawarn',
               html: 'Make please make sure you delete this post from the users profile page as well.<br><br><div id="thepentashelf"></div>',
               buttons: [
                  {
                     text: "Ok",
                     click: function(){
                        $(this).dialog('close');
                     }
                  }
               ]
            })
         }, 500);
      });
   }
}
$(document).ready(function(){
   vitals.pentaposts = new pentaposts();
});

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(global, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*****************************!*\
  !*** ./src/main/preload.ts ***!
  \*****************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const electron_1 = __webpack_require__(/*! electron */ "electron");
const electronHandler = {
    ipcRenderer: {
        sendMessage(channel, ...args) {
            electron_1.ipcRenderer.send(channel, ...args);
        },
        on(channel, func) {
            const subscription = (_event, ...args) => func(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            return () => {
                electron_1.ipcRenderer.removeListener(channel, subscription);
            };
        },
        once(channel, func) {
            electron_1.ipcRenderer.once(channel, (_event, ...args) => func(...args));
        },
    },
    ai: {
        createThread(title, presentationId) {
            return electron_1.ipcRenderer.invoke('ai:create-thread', title, presentationId);
        },
        getThread(threadId) {
            return electron_1.ipcRenderer.invoke('ai:get-thread', threadId);
        },
        saveThread(thread) {
            return electron_1.ipcRenderer.invoke('ai:save-thread', thread);
        },
        getThreadsForPresentation(presentationId) {
            return electron_1.ipcRenderer.invoke('ai:get-threads-for-presentation', presentationId);
        },
        deleteThread(threadId) {
            return electron_1.ipcRenderer.invoke('ai:delete-thread', threadId);
        },
        sendMessage(request) {
            return electron_1.ipcRenderer.invoke('ai:send-message', request);
        }
    },
    presentation: {
        initializePresentation(title) {
            return electron_1.ipcRenderer.invoke('presentation:initialize', title);
        },
        getPresentation() {
            return electron_1.ipcRenderer.invoke('presentation:get');
        },
        updateMeta(title) {
            return electron_1.ipcRenderer.invoke('presentation:update-meta', title);
        },
        addSlide(title) {
            return electron_1.ipcRenderer.invoke('presentation:add-slide', title);
        },
        updateSlide(slideId, updates) {
            return electron_1.ipcRenderer.invoke('presentation:update-slide', slideId, updates);
        },
        deleteSlide(slideId) {
            return electron_1.ipcRenderer.invoke('presentation:delete-slide', slideId);
        },
        addElement(slideId, element) {
            return electron_1.ipcRenderer.invoke('presentation:add-element', slideId, element);
        },
        updateElement(elementId, updates) {
            return electron_1.ipcRenderer.invoke('presentation:update-element', elementId, updates);
        },
        savePresentation() {
            return electron_1.ipcRenderer.invoke('presentation:save');
        },
        savePresentationAs() {
            return electron_1.ipcRenderer.invoke('presentation:save-as');
        },
        loadPresentation(filePath) {
            return electron_1.ipcRenderer.invoke('presentation:load', filePath);
        },
        getCurrentFilePath() {
            return electron_1.ipcRenderer.invoke('presentation:get-file-path');
        }
    },
};
electron_1.contextBridge.exposeInMainWorld('electron', electronHandler);

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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WUFDM0MsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNELFdBQVcsQ0FBQyxPQUFlO1lBQ3pCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELFVBQVUsQ0FBQyxPQUFlLEVBQUUsT0FBZ0I7WUFDMUMsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUNELGFBQWEsQ0FBQyxTQUFpQixFQUFFLE9BQWdCO1lBQy9DLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLENBQUM7UUFDRCxnQkFBZ0I7WUFDZCxPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNELGtCQUFrQjtZQUNoQixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELGdCQUFnQixDQUFDLFFBQWlCO1lBQ2hDLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELGtCQUFrQjtZQUNoQixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDMUQsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUVGLHdCQUFhLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJlbGVjdHJvblwiIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlLy4vc3JjL21haW4vcHJlbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2Uge1xuXHRcdHZhciBhID0gZmFjdG9yeSgpO1xuXHRcdGZvcih2YXIgaSBpbiBhKSAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnID8gZXhwb3J0cyA6IHJvb3QpW2ldID0gYVtpXTtcblx0fVxufSkoZ2xvYmFsLCAoKSA9PiB7XG5yZXR1cm4gIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsImltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyLCBJcGNSZW5kZXJlckV2ZW50IH0gZnJvbSAnZWxlY3Ryb24nO1xuXG5leHBvcnQgdHlwZSBQcmVzZW50YXRpb25DaGFubmVscyA9XG4gIHwgJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplJ1xuICB8ICdwcmVzZW50YXRpb246Z2V0J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLW1ldGEnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246c2F2ZSdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmUtYXMnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtYWRkZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtZGVsZXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOm1ldGEtdXBkYXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemVkJ1xuICB8ICdwcmVzZW50YXRpb246c2V0LXNlbGVjdGVkLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkZWQnO1xuXG5leHBvcnQgdHlwZSBBSUNoYW5uZWxzID1cbiAgfCAnYWk6Y3JlYXRlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZCdcbiAgfCAnYWk6c2F2ZS10aHJlYWQnXG4gIHwgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nXG4gIHwgJ2FpOmRlbGV0ZS10aHJlYWQnXG4gIHwgJ2FpOnNlbmQtbWVzc2FnZSdcbiAgfCAnYWk6dGhyZWFkLWNyZWF0ZWQnXG4gIHwgJ2FpOnRocmVhZC11cGRhdGVkJ1xuICB8ICdhaTp0aHJlYWQtZGVsZXRlZCdcbiAgfCAnYWk6bWVzc2FnZS1yZWNlaXZlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1zdGFydGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWNvbXBsZXRlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1lcnJvcic7XG5cbmNvbnN0IGVsZWN0cm9uSGFuZGxlciA9IHtcbiAgaXBjUmVuZGVyZXI6IHtcbiAgICBzZW5kTWVzc2FnZShjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgaXBjUmVuZGVyZXIuc2VuZChjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uKGNoYW5uZWw6IHN0cmluZywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gKF9ldmVudDogSXBjUmVuZGVyZXJFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PlxuICAgICAgICBmdW5jKC4uLmFyZ3MpO1xuICAgICAgaXBjUmVuZGVyZXIub24oY2hhbm5lbCwgc3Vic2NyaXB0aW9uKTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoY2hhbm5lbCwgc3Vic2NyaXB0aW9uKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICBvbmNlKGNoYW5uZWw6IHN0cmluZywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgaXBjUmVuZGVyZXIub25jZShjaGFubmVsLCAoX2V2ZW50LCAuLi5hcmdzKSA9PiBmdW5jKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9LFxuICBcbiAgYWk6IHtcbiAgICBjcmVhdGVUaHJlYWQodGl0bGU6IHN0cmluZywgcHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Y3JlYXRlLXRocmVhZCcsIHRpdGxlLCBwcmVzZW50YXRpb25JZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Z2V0LXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNhdmVUaHJlYWQodGhyZWFkOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzYXZlLXRocmVhZCcsIHRocmVhZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRzRm9yUHJlc2VudGF0aW9uKHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLCBwcmVzZW50YXRpb25JZCk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNlbmRNZXNzYWdlKHJlcXVlc3Q6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNlbmQtbWVzc2FnZScsIHJlcXVlc3QpO1xuICAgIH1cbiAgfSxcbiAgXG4gIHByZXNlbnRhdGlvbjoge1xuICAgIGluaXRpYWxpemVQcmVzZW50YXRpb24odGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmluaXRpYWxpemUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBnZXRQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0Jyk7XG4gICAgfSxcbiAgICB1cGRhdGVNZXRhKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGFkZFNsaWRlKHRpdGxlPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLXNsaWRlJywgdGl0bGUpO1xuICAgIH0sXG4gICAgdXBkYXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJywgc2xpZGVJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBkZWxldGVTbGlkZShzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnLCBzbGlkZUlkKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQoc2xpZGVJZDogc3RyaW5nLCBlbGVtZW50OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnLCBzbGlkZUlkLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHVwZGF0ZUVsZW1lbnQoZWxlbWVudElkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtZWxlbWVudCcsIGVsZW1lbnRJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnNhdmUnKTtcbiAgICB9LFxuICAgIHNhdmVQcmVzZW50YXRpb25BcygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlLWFzJyk7XG4gICAgfSxcbiAgICBsb2FkUHJlc2VudGF0aW9uKGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246bG9hZCcsIGZpbGVQYXRoKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRGaWxlUGF0aCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQtZmlsZS1wYXRoJyk7XG4gICAgfVxuICB9LFxufTtcblxuY29udGV4dEJyaWRnZS5leHBvc2VJbk1haW5Xb3JsZCgnZWxlY3Ryb24nLCBlbGVjdHJvbkhhbmRsZXIpO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9
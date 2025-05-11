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
    auth: {
        login() {
            return electron_1.ipcRenderer.invoke('auth:login');
        },
        logout() {
            return electron_1.ipcRenderer.invoke('auth:logout');
        },
        getUser() {
            return electron_1.ipcRenderer.invoke('auth:get-user');
        },
        refreshTokens() {
            return electron_1.ipcRenderer.invoke('auth:refresh-tokens');
        },
        getBalance() {
            return electron_1.ipcRenderer.invoke('auth:get-balance');
        }
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
        },
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
        },
        openFullscreen() {
            return electron_1.ipcRenderer.invoke('presentation:open-fullscreen');
        },
        closeFullscreen() {
            return electron_1.ipcRenderer.invoke('presentation:close-fullscreen');
        },
        isFullscreenOpen() {
            return electron_1.ipcRenderer.invoke('presentation:is-fullscreen-open');
        },
    },
};
electron_1.contextBridge.exposeInMainWorld('electron', electronHandler);

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNwRCxDQUFDO1FBQ0QsZ0JBQWdCLENBQUMsUUFBaUI7WUFDaEMsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsY0FBYztZQUNaLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQ0QsZUFBZTtZQUNiLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBQ0QsZ0JBQWdCO1lBQ2QsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7S0FDRjtDQUNGLENBQUM7QUFFRix3QkFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL3dlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiZWxlY3Ryb25cIiIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS8uL3NyYy9tYWluL3ByZWxvYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIHtcblx0XHR2YXIgYSA9IGZhY3RvcnkoKTtcblx0XHRmb3IodmFyIGkgaW4gYSkgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyA/IGV4cG9ydHMgOiByb290KVtpXSA9IGFbaV07XG5cdH1cbn0pKGdsb2JhbCwgKCkgPT4ge1xucmV0dXJuICIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImVsZWN0cm9uXCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJpbXBvcnQgeyBjb250ZXh0QnJpZGdlLCBpcGNSZW5kZXJlciwgSXBjUmVuZGVyZXJFdmVudCB9IGZyb20gJ2VsZWN0cm9uJztcbmltcG9ydCB7IEF1dGhDaGFubmVscyB9IGZyb20gJy4uL2NvbW1vbi9kb21haW4vaW50ZXJmYWNlcy9hdXRoLmludGVyZmFjZSc7XG5cbmV4cG9ydCB0eXBlIFByZXNlbnRhdGlvbkNoYW5uZWxzID1cbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpnZXQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZS1hcydcbiAgfCAncHJlc2VudGF0aW9uOmxvYWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1hZGRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1kZWxldGVkJ1xuICB8ICdwcmVzZW50YXRpb246bWV0YS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzZXQtc2VsZWN0ZWQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlZCdcbiAgfCAncHJlc2VudGF0aW9uOmxvYWRlZCdcbiAgfCAncHJlc2VudGF0aW9uOmdldC1maWxlLXBhdGgnXG4gIHwgJ3ByZXNlbnRhdGlvbjpvcGVuLWZ1bGxzY3JlZW4nXG4gIHwgJ3ByZXNlbnRhdGlvbjpjbG9zZS1mdWxsc2NyZWVuJ1xuICB8ICdwcmVzZW50YXRpb246aXMtZnVsbHNjcmVlbi1vcGVuJ1xuICB8ICdwcmVzZW50YXRpb246ZnVsbHNjcmVlbi1vcGVuZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpmdWxsc2NyZWVuLWNsb3NlZCc7XG5cbmV4cG9ydCB0eXBlIEFJQ2hhbm5lbHMgPVxuICB8ICdhaTpjcmVhdGUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkJ1xuICB8ICdhaTpzYXZlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbidcbiAgfCAnYWk6ZGVsZXRlLXRocmVhZCdcbiAgfCAnYWk6c2VuZC1tZXNzYWdlJ1xuICB8ICdhaTp0aHJlYWQtY3JlYXRlZCdcbiAgfCAnYWk6dGhyZWFkLXVwZGF0ZWQnXG4gIHwgJ2FpOnRocmVhZC1kZWxldGVkJ1xuICB8ICdhaTptZXNzYWdlLXJlY2VpdmVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLXN0YXJ0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctY29tcGxldGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWVycm9yJztcblxudHlwZSBJcGNDaGFubmVscyA9IFByZXNlbnRhdGlvbkNoYW5uZWxzIHwgQUlDaGFubmVscyB8IEF1dGhDaGFubmVscztcblxuY29uc3QgZWxlY3Ryb25IYW5kbGVyID0ge1xuICBpcGNSZW5kZXJlcjoge1xuICAgIHNlbmRNZXNzYWdlKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb24oY2hhbm5lbDogSXBjQ2hhbm5lbHMsIGZ1bmM6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IChfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgICAgZnVuYyguLi5hcmdzKTtcbiAgICAgIGlwY1JlbmRlcmVyLm9uKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG4gICAgICB9O1xuICAgIH0sXG4gICAgb25jZShjaGFubmVsOiBJcGNDaGFubmVscywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgaXBjUmVuZGVyZXIub25jZShjaGFubmVsLCAoX2V2ZW50LCAuLi5hcmdzKSA9PiBmdW5jKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9LFxuICBcbiAgYXV0aDoge1xuICAgIGxvZ2luKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpsb2dpbicpO1xuICAgIH0sXG4gICAgbG9nb3V0KCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpsb2dvdXQnKTtcbiAgICB9LFxuICAgIGdldFVzZXIoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmdldC11c2VyJyk7XG4gICAgfSxcbiAgICByZWZyZXNoVG9rZW5zKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpyZWZyZXNoLXRva2VucycpO1xuICAgIH0sXG4gICAgZ2V0QmFsYW5jZSgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6Z2V0LWJhbGFuY2UnKTtcbiAgICB9XG4gIH0sXG4gIFxuICBhaToge1xuICAgIGNyZWF0ZVRocmVhZCh0aXRsZTogc3RyaW5nLCBwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNhdmUtdGhyZWFkJywgdGhyZWFkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZHNGb3JQcmVzZW50YXRpb24ocHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLFxuICAgICAgICBwcmVzZW50YXRpb25JZCxcbiAgICAgICk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNlbmRNZXNzYWdlKHJlcXVlc3Q6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNlbmQtbWVzc2FnZScsIHJlcXVlc3QpO1xuICAgIH0sXG4gIH0sXG5cbiAgcHJlc2VudGF0aW9uOiB7XG4gICAgaW5pdGlhbGl6ZVByZXNlbnRhdGlvbih0aXRsZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246aW5pdGlhbGl6ZScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGdldFByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQnKTtcbiAgICB9LFxuICAgIHVwZGF0ZU1ldGEodGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnVwZGF0ZS1tZXRhJywgdGl0bGUpO1xuICAgIH0sXG4gICAgYWRkU2xpZGUodGl0bGU/OiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICB1cGRhdGVTbGlkZShzbGlkZUlkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnLCBzbGlkZUlkLCB1cGRhdGVzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVNsaWRlKHNsaWRlSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZScsIHNsaWRlSWQpO1xuICAgIH0sXG4gICAgYWRkRWxlbWVudChzbGlkZUlkOiBzdHJpbmcsIGVsZW1lbnQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCcsIHNsaWRlSWQsIGVsZW1lbnQpO1xuICAgIH0sXG4gICAgdXBkYXRlRWxlbWVudChlbGVtZW50SWQ6IHN0cmluZywgdXBkYXRlczogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtZWxlbWVudCcsXG4gICAgICAgIGVsZW1lbnRJZCxcbiAgICAgICAgdXBkYXRlcyxcbiAgICAgICk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnNhdmUnKTtcbiAgICB9LFxuICAgIHNhdmVQcmVzZW50YXRpb25BcygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlLWFzJyk7XG4gICAgfSxcbiAgICBsb2FkUHJlc2VudGF0aW9uKGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246bG9hZCcsIGZpbGVQYXRoKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRGaWxlUGF0aCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQtZmlsZS1wYXRoJyk7XG4gICAgfSxcbiAgICBvcGVuRnVsbHNjcmVlbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpvcGVuLWZ1bGxzY3JlZW4nKTtcbiAgICB9LFxuICAgIGNsb3NlRnVsbHNjcmVlbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpjbG9zZS1mdWxsc2NyZWVuJyk7XG4gICAgfSxcbiAgICBpc0Z1bGxzY3JlZW5PcGVuKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmlzLWZ1bGxzY3JlZW4tb3BlbicpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbicsIGVsZWN0cm9uSGFuZGxlcik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=
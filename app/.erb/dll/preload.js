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
        },
    },
    critic: {
        createThread(title, presentationId) {
            return electron_1.ipcRenderer.invoke('critic:create-thread', title, presentationId);
        },
        getThread(threadId) {
            return electron_1.ipcRenderer.invoke('critic:get-thread', threadId);
        },
        saveThread(thread) {
            return electron_1.ipcRenderer.invoke('critic:save-thread', thread);
        },
        getThreadsForPresentation(presentationId) {
            return electron_1.ipcRenderer.invoke('critic:get-threads-for-presentation', presentationId);
        },
        deleteThread(threadId) {
            return electron_1.ipcRenderer.invoke('critic:delete-thread', threadId);
        },
        reviewSlide(threadId, slideId) {
            return electron_1.ipcRenderer.invoke('critic:review-slide', threadId, slideId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUM3RCxDQUFDO1FBQ0QsZ0JBQWdCO1lBQ2QsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7S0FDRjtDQUNGLENBQUM7QUFFRix3QkFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL3dlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiZWxlY3Ryb25cIiIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS8uL3NyYy9tYWluL3ByZWxvYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIHtcblx0XHR2YXIgYSA9IGZhY3RvcnkoKTtcblx0XHRmb3IodmFyIGkgaW4gYSkgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyA/IGV4cG9ydHMgOiByb290KVtpXSA9IGFbaV07XG5cdH1cbn0pKGdsb2JhbCwgKCkgPT4ge1xucmV0dXJuICIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImVsZWN0cm9uXCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJpbXBvcnQgeyBjb250ZXh0QnJpZGdlLCBpcGNSZW5kZXJlciwgSXBjUmVuZGVyZXJFdmVudCB9IGZyb20gJ2VsZWN0cm9uJztcbmltcG9ydCB7IEF1dGhDaGFubmVscyB9IGZyb20gJy4uL2NvbW1vbi9kb21haW4vaW50ZXJmYWNlcy9hdXRoLmludGVyZmFjZSc7XG5cbmV4cG9ydCB0eXBlIFByZXNlbnRhdGlvbkNoYW5uZWxzID1cbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpnZXQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZS1hcydcbiAgfCAncHJlc2VudGF0aW9uOmxvYWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1hZGRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1kZWxldGVkJ1xuICB8ICdwcmVzZW50YXRpb246bWV0YS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzZXQtc2VsZWN0ZWQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlZCdcbiAgfCAncHJlc2VudGF0aW9uOmxvYWRlZCdcbiAgfCAncHJlc2VudGF0aW9uOmdldC1maWxlLXBhdGgnXG4gIHwgJ3ByZXNlbnRhdGlvbjpvcGVuLWZ1bGxzY3JlZW4nXG4gIHwgJ3ByZXNlbnRhdGlvbjpjbG9zZS1mdWxsc2NyZWVuJ1xuICB8ICdwcmVzZW50YXRpb246aXMtZnVsbHNjcmVlbi1vcGVuJ1xuICB8ICdwcmVzZW50YXRpb246ZnVsbHNjcmVlbi1vcGVuZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpmdWxsc2NyZWVuLWNsb3NlZCc7XG5cbmV4cG9ydCB0eXBlIEFJQ2hhbm5lbHMgPVxuICB8ICdhaTpjcmVhdGUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkJ1xuICB8ICdhaTpzYXZlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbidcbiAgfCAnYWk6ZGVsZXRlLXRocmVhZCdcbiAgfCAnYWk6c2VuZC1tZXNzYWdlJ1xuICB8ICdhaTp0aHJlYWQtY3JlYXRlZCdcbiAgfCAnYWk6dGhyZWFkLXVwZGF0ZWQnXG4gIHwgJ2FpOnRocmVhZC1kZWxldGVkJ1xuICB8ICdhaTptZXNzYWdlLXJlY2VpdmVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLXN0YXJ0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctY29tcGxldGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWVycm9yJ1xuICB8ICdhaTptZXNzYWdlLWNodW5rLXJlY2VpdmVkJztcblxuZXhwb3J0IHR5cGUgQ3JpdGljQ2hhbm5lbHMgPVxuICB8ICdjcml0aWM6Y3JlYXRlLXRocmVhZCdcbiAgfCAnY3JpdGljOmdldC10aHJlYWQnXG4gIHwgJ2NyaXRpYzpzYXZlLXRocmVhZCdcbiAgfCAnY3JpdGljOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nXG4gIHwgJ2NyaXRpYzpkZWxldGUtdGhyZWFkJ1xuICB8ICdjcml0aWM6cmV2aWV3LXNsaWRlJ1xuICB8ICdjcml0aWM6dGhyZWFkLWNyZWF0ZWQnXG4gIHwgJ2NyaXRpYzp0aHJlYWQtdXBkYXRlZCdcbiAgfCAnY3JpdGljOnRocmVhZC1kZWxldGVkJ1xuICB8ICdjcml0aWM6bWVzc2FnZS1yZWNlaXZlZCdcbiAgfCAnY3JpdGljOnByb2Nlc3Npbmctc3RhcnRlZCdcbiAgfCAnY3JpdGljOnByb2Nlc3NpbmctY29tcGxldGVkJ1xuICB8ICdjcml0aWM6cHJvY2Vzc2luZy1lcnJvcidcbiAgfCAnY3JpdGljOm1lc3NhZ2UtY2h1bmstcmVjZWl2ZWQnO1xuXG50eXBlIElwY0NoYW5uZWxzID1cbiAgfCBQcmVzZW50YXRpb25DaGFubmVsc1xuICB8IEFJQ2hhbm5lbHNcbiAgfCBDcml0aWNDaGFubmVsc1xuICB8IEF1dGhDaGFubmVscztcblxuY29uc3QgZWxlY3Ryb25IYW5kbGVyID0ge1xuICBpcGNSZW5kZXJlcjoge1xuICAgIHNlbmRNZXNzYWdlKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb24oY2hhbm5lbDogSXBjQ2hhbm5lbHMsIGZ1bmM6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IChfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgICAgZnVuYyguLi5hcmdzKTtcbiAgICAgIGlwY1JlbmRlcmVyLm9uKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG4gICAgICB9O1xuICAgIH0sXG4gICAgb25jZShjaGFubmVsOiBJcGNDaGFubmVscywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgaXBjUmVuZGVyZXIub25jZShjaGFubmVsLCAoX2V2ZW50LCAuLi5hcmdzKSA9PiBmdW5jKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9LFxuXG4gIGF1dGg6IHtcbiAgICBsb2dpbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9naW4nKTtcbiAgICB9LFxuICAgIGxvZ291dCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9nb3V0Jyk7XG4gICAgfSxcbiAgICBnZXRVc2VyKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpnZXQtdXNlcicpO1xuICAgIH0sXG4gICAgcmVmcmVzaFRva2VucygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6cmVmcmVzaC10b2tlbnMnKTtcbiAgICB9LFxuICAgIGdldEJhbGFuY2UoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmdldC1iYWxhbmNlJyk7XG4gICAgfSxcbiAgfSxcblxuICBhaToge1xuICAgIGNyZWF0ZVRocmVhZCh0aXRsZTogc3RyaW5nLCBwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNhdmUtdGhyZWFkJywgdGhyZWFkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZHNGb3JQcmVzZW50YXRpb24ocHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLFxuICAgICAgICBwcmVzZW50YXRpb25JZCxcbiAgICAgICk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNlbmRNZXNzYWdlKHJlcXVlc3Q6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNlbmQtbWVzc2FnZScsIHJlcXVlc3QpO1xuICAgIH0sXG4gIH0sXG5cbiAgY3JpdGljOiB7XG4gICAgY3JlYXRlVGhyZWFkKHRpdGxlOiBzdHJpbmcsIHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2NyaXRpYzpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdjcml0aWM6Z2V0LXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNhdmVUaHJlYWQodGhyZWFkOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdjcml0aWM6c2F2ZS10aHJlYWQnLCB0aHJlYWQpO1xuICAgIH0sXG4gICAgZ2V0VGhyZWFkc0ZvclByZXNlbnRhdGlvbihwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKFxuICAgICAgICAnY3JpdGljOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLFxuICAgICAgICBwcmVzZW50YXRpb25JZCxcbiAgICAgICk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnY3JpdGljOmRlbGV0ZS10aHJlYWQnLCB0aHJlYWRJZCk7XG4gICAgfSxcbiAgICByZXZpZXdTbGlkZSh0aHJlYWRJZDogc3RyaW5nLCBzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2NyaXRpYzpyZXZpZXctc2xpZGUnLCB0aHJlYWRJZCwgc2xpZGVJZCk7XG4gICAgfSxcbiAgfSxcblxuICBwcmVzZW50YXRpb246IHtcbiAgICBpbml0aWFsaXplUHJlc2VudGF0aW9uKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplJywgdGl0bGUpO1xuICAgIH0sXG4gICAgZ2V0UHJlc2VudGF0aW9uKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmdldCcpO1xuICAgIH0sXG4gICAgdXBkYXRlTWV0YSh0aXRsZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLW1ldGEnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBhZGRTbGlkZSh0aXRsZT86IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmFkZC1zbGlkZScsIHRpdGxlKTtcbiAgICB9LFxuICAgIHVwZGF0ZVNsaWRlKHNsaWRlSWQ6IHN0cmluZywgdXBkYXRlczogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnVwZGF0ZS1zbGlkZScsIHNsaWRlSWQsIHVwZGF0ZXMpO1xuICAgIH0sXG4gICAgZGVsZXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246ZGVsZXRlLXNsaWRlJywgc2xpZGVJZCk7XG4gICAgfSxcbiAgICBhZGRFbGVtZW50KHNsaWRlSWQ6IHN0cmluZywgZWxlbWVudDogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmFkZC1lbGVtZW50Jywgc2xpZGVJZCwgZWxlbWVudCk7XG4gICAgfSxcbiAgICB1cGRhdGVFbGVtZW50KGVsZW1lbnRJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKFxuICAgICAgICAncHJlc2VudGF0aW9uOnVwZGF0ZS1lbGVtZW50JyxcbiAgICAgICAgZWxlbWVudElkLFxuICAgICAgICB1cGRhdGVzLFxuICAgICAgKTtcbiAgICB9LFxuICAgIHNhdmVQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZScpO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbkFzKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnNhdmUtYXMnKTtcbiAgICB9LFxuICAgIGxvYWRQcmVzZW50YXRpb24oZmlsZVBhdGg/OiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpsb2FkJywgZmlsZVBhdGgpO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudEZpbGVQYXRoKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmdldC1maWxlLXBhdGgnKTtcbiAgICB9LFxuICAgIG9wZW5GdWxsc2NyZWVuKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOm9wZW4tZnVsbHNjcmVlbicpO1xuICAgIH0sXG4gICAgY2xvc2VGdWxsc2NyZWVuKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmNsb3NlLWZ1bGxzY3JlZW4nKTtcbiAgICB9LFxuICAgIGlzRnVsbHNjcmVlbk9wZW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246aXMtZnVsbHNjcmVlbi1vcGVuJyk7XG4gICAgfSxcbiAgfSxcbn07XG5cbmNvbnRleHRCcmlkZ2UuZXhwb3NlSW5NYWluV29ybGQoJ2VsZWN0cm9uJywgZWxlY3Ryb25IYW5kbGVyKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==
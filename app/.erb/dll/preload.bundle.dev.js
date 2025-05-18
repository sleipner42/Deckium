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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0FBQyxDQUFDO1FBQzdELENBQUM7UUFDRCxnQkFBZ0I7WUFDZCxPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDL0QsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUVGLHdCQUFhLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJlbGVjdHJvblwiIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlLy4vc3JjL21haW4vcHJlbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2Uge1xuXHRcdHZhciBhID0gZmFjdG9yeSgpO1xuXHRcdGZvcih2YXIgaSBpbiBhKSAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnID8gZXhwb3J0cyA6IHJvb3QpW2ldID0gYVtpXTtcblx0fVxufSkoZ2xvYmFsLCAoKSA9PiB7XG5yZXR1cm4gIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsImltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyLCBJcGNSZW5kZXJlckV2ZW50IH0gZnJvbSAnZWxlY3Ryb24nO1xuaW1wb3J0IHsgQXV0aENoYW5uZWxzIH0gZnJvbSAnLi4vY29tbW9uL2RvbWFpbi9pbnRlcmZhY2VzL2F1dGguaW50ZXJmYWNlJztcblxuZXhwb3J0IHR5cGUgUHJlc2VudGF0aW9uQ2hhbm5lbHMgPVxuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZSdcbiAgfCAncHJlc2VudGF0aW9uOmdldCdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1tZXRhJ1xuICB8ICdwcmVzZW50YXRpb246YWRkLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246ZGVsZXRlLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtZWxlbWVudCdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlLWFzJ1xuICB8ICdwcmVzZW50YXRpb246bG9hZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLWFkZGVkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtdXBkYXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLWRlbGV0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjptZXRhLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplZCdcbiAgfCAncHJlc2VudGF0aW9uOnNldC1zZWxlY3RlZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmVkJ1xuICB8ICdwcmVzZW50YXRpb246bG9hZGVkJ1xuICB8ICdwcmVzZW50YXRpb246Z2V0LWZpbGUtcGF0aCdcbiAgfCAncHJlc2VudGF0aW9uOm9wZW4tZnVsbHNjcmVlbidcbiAgfCAncHJlc2VudGF0aW9uOmNsb3NlLWZ1bGxzY3JlZW4nXG4gIHwgJ3ByZXNlbnRhdGlvbjppcy1mdWxsc2NyZWVuLW9wZW4nXG4gIHwgJ3ByZXNlbnRhdGlvbjpmdWxsc2NyZWVuLW9wZW5lZCdcbiAgfCAncHJlc2VudGF0aW9uOmZ1bGxzY3JlZW4tY2xvc2VkJztcblxuZXhwb3J0IHR5cGUgQUlDaGFubmVscyA9XG4gIHwgJ2FpOmNyZWF0ZS10aHJlYWQnXG4gIHwgJ2FpOmdldC10aHJlYWQnXG4gIHwgJ2FpOnNhdmUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkcy1mb3ItcHJlc2VudGF0aW9uJ1xuICB8ICdhaTpkZWxldGUtdGhyZWFkJ1xuICB8ICdhaTpzZW5kLW1lc3NhZ2UnXG4gIHwgJ2FpOnRocmVhZC1jcmVhdGVkJ1xuICB8ICdhaTp0aHJlYWQtdXBkYXRlZCdcbiAgfCAnYWk6dGhyZWFkLWRlbGV0ZWQnXG4gIHwgJ2FpOm1lc3NhZ2UtcmVjZWl2ZWQnXG4gIHwgJ2FpOnByb2Nlc3Npbmctc3RhcnRlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1jb21wbGV0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctZXJyb3InXG4gIHwgJ2FpOm1lc3NhZ2UtY2h1bmstcmVjZWl2ZWQnO1xuXG5leHBvcnQgdHlwZSBDcml0aWNDaGFubmVscyA9XG4gIHwgJ2NyaXRpYzpjcmVhdGUtdGhyZWFkJ1xuICB8ICdjcml0aWM6Z2V0LXRocmVhZCdcbiAgfCAnY3JpdGljOnNhdmUtdGhyZWFkJ1xuICB8ICdjcml0aWM6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbidcbiAgfCAnY3JpdGljOmRlbGV0ZS10aHJlYWQnXG4gIHwgJ2NyaXRpYzpyZXZpZXctc2xpZGUnXG4gIHwgJ2NyaXRpYzp0aHJlYWQtY3JlYXRlZCdcbiAgfCAnY3JpdGljOnRocmVhZC11cGRhdGVkJ1xuICB8ICdjcml0aWM6dGhyZWFkLWRlbGV0ZWQnXG4gIHwgJ2NyaXRpYzptZXNzYWdlLXJlY2VpdmVkJ1xuICB8ICdjcml0aWM6cHJvY2Vzc2luZy1zdGFydGVkJ1xuICB8ICdjcml0aWM6cHJvY2Vzc2luZy1jb21wbGV0ZWQnXG4gIHwgJ2NyaXRpYzpwcm9jZXNzaW5nLWVycm9yJ1xuICB8ICdjcml0aWM6bWVzc2FnZS1jaHVuay1yZWNlaXZlZCc7XG5cbnR5cGUgSXBjQ2hhbm5lbHMgPSBQcmVzZW50YXRpb25DaGFubmVscyB8IEFJQ2hhbm5lbHMgfCBDcml0aWNDaGFubmVscyB8IEF1dGhDaGFubmVscztcblxuY29uc3QgZWxlY3Ryb25IYW5kbGVyID0ge1xuICBpcGNSZW5kZXJlcjoge1xuICAgIHNlbmRNZXNzYWdlKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb24oY2hhbm5lbDogSXBjQ2hhbm5lbHMsIGZ1bmM6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IChfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgICAgZnVuYyguLi5hcmdzKTtcbiAgICAgIGlwY1JlbmRlcmVyLm9uKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWwsIHN1YnNjcmlwdGlvbik7XG4gICAgICB9O1xuICAgIH0sXG4gICAgb25jZShjaGFubmVsOiBJcGNDaGFubmVscywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgaXBjUmVuZGVyZXIub25jZShjaGFubmVsLCAoX2V2ZW50LCAuLi5hcmdzKSA9PiBmdW5jKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9LFxuICBcbiAgYXV0aDoge1xuICAgIGxvZ2luKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpsb2dpbicpO1xuICAgIH0sXG4gICAgbG9nb3V0KCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpsb2dvdXQnKTtcbiAgICB9LFxuICAgIGdldFVzZXIoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmdldC11c2VyJyk7XG4gICAgfSxcbiAgICByZWZyZXNoVG9rZW5zKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpyZWZyZXNoLXRva2VucycpO1xuICAgIH0sXG4gICAgZ2V0QmFsYW5jZSgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6Z2V0LWJhbGFuY2UnKTtcbiAgICB9XG4gIH0sXG4gIFxuICBhaToge1xuICAgIGNyZWF0ZVRocmVhZCh0aXRsZTogc3RyaW5nLCBwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNhdmUtdGhyZWFkJywgdGhyZWFkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZHNGb3JQcmVzZW50YXRpb24ocHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLFxuICAgICAgICBwcmVzZW50YXRpb25JZCxcbiAgICAgICk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNlbmRNZXNzYWdlKHJlcXVlc3Q6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNlbmQtbWVzc2FnZScsIHJlcXVlc3QpO1xuICAgIH0sXG4gIH0sXG4gIFxuICBjcml0aWM6IHtcbiAgICBjcmVhdGVUaHJlYWQodGl0bGU6IHN0cmluZywgcHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnY3JpdGljOmNyZWF0ZS10aHJlYWQnLCB0aXRsZSwgcHJlc2VudGF0aW9uSWQpO1xuICAgIH0sXG4gICAgZ2V0VGhyZWFkKHRocmVhZElkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2NyaXRpYzpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2NyaXRpYzpzYXZlLXRocmVhZCcsIHRocmVhZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRzRm9yUHJlc2VudGF0aW9uKHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdjcml0aWM6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbicsXG4gICAgICAgIHByZXNlbnRhdGlvbklkLFxuICAgICAgKTtcbiAgICB9LFxuICAgIGRlbGV0ZVRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdjcml0aWM6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHJldmlld1NsaWRlKHRocmVhZElkOiBzdHJpbmcsIHNsaWRlSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnY3JpdGljOnJldmlldy1zbGlkZScsIHRocmVhZElkLCBzbGlkZUlkKTtcbiAgICB9LFxuICB9LFxuXG4gIHByZXNlbnRhdGlvbjoge1xuICAgIGluaXRpYWxpemVQcmVzZW50YXRpb24odGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmluaXRpYWxpemUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBnZXRQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0Jyk7XG4gICAgfSxcbiAgICB1cGRhdGVNZXRhKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGFkZFNsaWRlKHRpdGxlPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLXNsaWRlJywgdGl0bGUpO1xuICAgIH0sXG4gICAgdXBkYXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJywgc2xpZGVJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBkZWxldGVTbGlkZShzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnLCBzbGlkZUlkKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQoc2xpZGVJZDogc3RyaW5nLCBlbGVtZW50OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnLCBzbGlkZUlkLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHVwZGF0ZUVsZW1lbnQoZWxlbWVudElkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnLFxuICAgICAgICBlbGVtZW50SWQsXG4gICAgICAgIHVwZGF0ZXMsXG4gICAgICApO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlJyk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uQXMoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZS1hcycpO1xuICAgIH0sXG4gICAgbG9hZFByZXNlbnRhdGlvbihmaWxlUGF0aD86IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmxvYWQnLCBmaWxlUGF0aCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RmlsZVBhdGgoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0LWZpbGUtcGF0aCcpO1xuICAgIH0sXG4gICAgb3BlbkZ1bGxzY3JlZW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246b3Blbi1mdWxsc2NyZWVuJyk7XG4gICAgfSxcbiAgICBjbG9zZUZ1bGxzY3JlZW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Y2xvc2UtZnVsbHNjcmVlbicpO1xuICAgIH0sXG4gICAgaXNGdWxsc2NyZWVuT3BlbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjppcy1mdWxsc2NyZWVuLW9wZW4nKTtcbiAgICB9LFxuICB9LFxufTtcblxuY29udGV4dEJyaWRnZS5leHBvc2VJbk1haW5Xb3JsZCgnZWxlY3Ryb24nLCBlbGVjdHJvbkhhbmRsZXIpO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9
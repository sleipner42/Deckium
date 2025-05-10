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
    },
};
electron_1.contextBridge.exposeInMainWorld('electron', electronHandler);

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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USxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELGtCQUFrQjtZQUNoQixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDMUQsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUVGLHdCQUFhLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJlbGVjdHJvblwiIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2VsZWN0cm9uLXJlYWN0LWJvaWxlcnBsYXRlLy4vc3JjL21haW4vcHJlbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2Uge1xuXHRcdHZhciBhID0gZmFjdG9yeSgpO1xuXHRcdGZvcih2YXIgaSBpbiBhKSAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnID8gZXhwb3J0cyA6IHJvb3QpW2ldID0gYVtpXTtcblx0fVxufSkoZ2xvYmFsLCAoKSA9PiB7XG5yZXR1cm4gIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsImltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyLCBJcGNSZW5kZXJlckV2ZW50IH0gZnJvbSAnZWxlY3Ryb24nO1xuaW1wb3J0IHsgQXV0aENoYW5uZWxzIH0gZnJvbSAnLi4vY29tbW9uL2RvbWFpbi9pbnRlcmZhY2VzL2F1dGguaW50ZXJmYWNlJztcblxuZXhwb3J0IHR5cGUgUHJlc2VudGF0aW9uQ2hhbm5lbHMgPVxuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZSdcbiAgfCAncHJlc2VudGF0aW9uOmdldCdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1tZXRhJ1xuICB8ICdwcmVzZW50YXRpb246YWRkLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246ZGVsZXRlLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtZWxlbWVudCdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlLWFzJ1xuICB8ICdwcmVzZW50YXRpb246bG9hZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLWFkZGVkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtdXBkYXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLWRlbGV0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjptZXRhLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplZCdcbiAgfCAncHJlc2VudGF0aW9uOnNldC1zZWxlY3RlZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmVkJ1xuICB8ICdwcmVzZW50YXRpb246bG9hZGVkJztcblxuZXhwb3J0IHR5cGUgQUlDaGFubmVscyA9XG4gIHwgJ2FpOmNyZWF0ZS10aHJlYWQnXG4gIHwgJ2FpOmdldC10aHJlYWQnXG4gIHwgJ2FpOnNhdmUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkcy1mb3ItcHJlc2VudGF0aW9uJ1xuICB8ICdhaTpkZWxldGUtdGhyZWFkJ1xuICB8ICdhaTpzZW5kLW1lc3NhZ2UnXG4gIHwgJ2FpOnRocmVhZC1jcmVhdGVkJ1xuICB8ICdhaTp0aHJlYWQtdXBkYXRlZCdcbiAgfCAnYWk6dGhyZWFkLWRlbGV0ZWQnXG4gIHwgJ2FpOm1lc3NhZ2UtcmVjZWl2ZWQnXG4gIHwgJ2FpOnByb2Nlc3Npbmctc3RhcnRlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1jb21wbGV0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctZXJyb3InO1xuXG50eXBlIElwY0NoYW5uZWxzID0gUHJlc2VudGF0aW9uQ2hhbm5lbHMgfCBBSUNoYW5uZWxzIHwgQXV0aENoYW5uZWxzO1xuXG5jb25zdCBlbGVjdHJvbkhhbmRsZXIgPSB7XG4gIGlwY1JlbmRlcmVyOiB7XG4gICAgc2VuZE1lc3NhZ2UoY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pIHtcbiAgICAgIGlwY1JlbmRlcmVyLnNlbmQoY2hhbm5lbCwgLi4uYXJncyk7XG4gICAgfSxcbiAgICBvbihjaGFubmVsOiBJcGNDaGFubmVscywgZnVuYzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gKF9ldmVudDogSXBjUmVuZGVyZXJFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PlxuICAgICAgICBmdW5jKC4uLmFyZ3MpO1xuICAgICAgaXBjUmVuZGVyZXIub24oY2hhbm5lbCwgc3Vic2NyaXB0aW9uKTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoY2hhbm5lbCwgc3Vic2NyaXB0aW9uKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICBvbmNlKGNoYW5uZWw6IElwY0NoYW5uZWxzLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBpcGNSZW5kZXJlci5vbmNlKGNoYW5uZWwsIChfZXZlbnQsIC4uLmFyZ3MpID0+IGZ1bmMoLi4uYXJncykpO1xuICAgIH0sXG4gIH0sXG4gIFxuICBhdXRoOiB7XG4gICAgbG9naW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmxvZ2luJyk7XG4gICAgfSxcbiAgICBsb2dvdXQoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmxvZ291dCcpO1xuICAgIH0sXG4gICAgZ2V0VXNlcigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6Z2V0LXVzZXInKTtcbiAgICB9LFxuICAgIHJlZnJlc2hUb2tlbnMoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOnJlZnJlc2gtdG9rZW5zJyk7XG4gICAgfVxuICB9LFxuICBcbiAgYWk6IHtcbiAgICBjcmVhdGVUaHJlYWQodGl0bGU6IHN0cmluZywgcHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Y3JlYXRlLXRocmVhZCcsIHRpdGxlLCBwcmVzZW50YXRpb25JZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Z2V0LXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNhdmVUaHJlYWQodGhyZWFkOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzYXZlLXRocmVhZCcsIHRocmVhZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRzRm9yUHJlc2VudGF0aW9uKHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdhaTpnZXQtdGhyZWFkcy1mb3ItcHJlc2VudGF0aW9uJyxcbiAgICAgICAgcHJlc2VudGF0aW9uSWQsXG4gICAgICApO1xuICAgIH0sXG4gICAgZGVsZXRlVGhyZWFkKHRocmVhZElkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOmRlbGV0ZS10aHJlYWQnLCB0aHJlYWRJZCk7XG4gICAgfSxcbiAgICBzZW5kTWVzc2FnZShyZXF1ZXN0OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzZW5kLW1lc3NhZ2UnLCByZXF1ZXN0KTtcbiAgICB9LFxuICB9LFxuXG4gIHByZXNlbnRhdGlvbjoge1xuICAgIGluaXRpYWxpemVQcmVzZW50YXRpb24odGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmluaXRpYWxpemUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBnZXRQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0Jyk7XG4gICAgfSxcbiAgICB1cGRhdGVNZXRhKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGFkZFNsaWRlKHRpdGxlPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLXNsaWRlJywgdGl0bGUpO1xuICAgIH0sXG4gICAgdXBkYXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJywgc2xpZGVJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBkZWxldGVTbGlkZShzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnLCBzbGlkZUlkKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQoc2xpZGVJZDogc3RyaW5nLCBlbGVtZW50OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnLCBzbGlkZUlkLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHVwZGF0ZUVsZW1lbnQoZWxlbWVudElkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnLFxuICAgICAgICBlbGVtZW50SWQsXG4gICAgICAgIHVwZGF0ZXMsXG4gICAgICApO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlJyk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uQXMoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZS1hcycpO1xuICAgIH0sXG4gICAgbG9hZFByZXNlbnRhdGlvbihmaWxlUGF0aD86IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmxvYWQnLCBmaWxlUGF0aCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RmlsZVBhdGgoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0LWZpbGUtcGF0aCcpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbicsIGVsZWN0cm9uSGFuZGxlcik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=
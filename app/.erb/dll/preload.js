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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNELGdCQUFnQixDQUFDLFFBQWlCO1lBQ2hDLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELGtCQUFrQjtZQUNoQixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUNELGNBQWM7WUFDWixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUNELGVBQWU7WUFDYixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNELGdCQUFnQjtZQUNkLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUMvRCxDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsd0JBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImVsZWN0cm9uXCIiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvLi9zcmMvbWFpbi9wcmVsb2FkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSB7XG5cdFx0dmFyIGEgPSBmYWN0b3J5KCk7XG5cdFx0Zm9yKHZhciBpIGluIGEpICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgPyBleHBvcnRzIDogcm9vdClbaV0gPSBhW2ldO1xuXHR9XG59KShnbG9iYWwsICgpID0+IHtcbnJldHVybiAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiaW1wb3J0IHsgY29udGV4dEJyaWRnZSwgaXBjUmVuZGVyZXIsIElwY1JlbmRlcmVyRXZlbnQgfSBmcm9tICdlbGVjdHJvbic7XG5pbXBvcnQgeyBBdXRoQ2hhbm5lbHMgfSBmcm9tICcuLi9jb21tb24vZG9tYWluL2ludGVyZmFjZXMvYXV0aC5pbnRlcmZhY2UnO1xuXG5leHBvcnQgdHlwZSBQcmVzZW50YXRpb25DaGFubmVscyA9XG4gIHwgJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplJ1xuICB8ICdwcmVzZW50YXRpb246Z2V0J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLW1ldGEnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246c2F2ZSdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmUtYXMnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtYWRkZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtZGVsZXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOm1ldGEtdXBkYXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemVkJ1xuICB8ICdwcmVzZW50YXRpb246c2V0LXNlbGVjdGVkLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpnZXQtZmlsZS1wYXRoJ1xuICB8ICdwcmVzZW50YXRpb246b3Blbi1mdWxsc2NyZWVuJ1xuICB8ICdwcmVzZW50YXRpb246Y2xvc2UtZnVsbHNjcmVlbidcbiAgfCAncHJlc2VudGF0aW9uOmlzLWZ1bGxzY3JlZW4tb3BlbidcbiAgfCAncHJlc2VudGF0aW9uOmZ1bGxzY3JlZW4tb3BlbmVkJ1xuICB8ICdwcmVzZW50YXRpb246ZnVsbHNjcmVlbi1jbG9zZWQnO1xuXG5leHBvcnQgdHlwZSBBSUNoYW5uZWxzID1cbiAgfCAnYWk6Y3JlYXRlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZCdcbiAgfCAnYWk6c2F2ZS10aHJlYWQnXG4gIHwgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nXG4gIHwgJ2FpOmRlbGV0ZS10aHJlYWQnXG4gIHwgJ2FpOnNlbmQtbWVzc2FnZSdcbiAgfCAnYWk6dGhyZWFkLWNyZWF0ZWQnXG4gIHwgJ2FpOnRocmVhZC11cGRhdGVkJ1xuICB8ICdhaTp0aHJlYWQtZGVsZXRlZCdcbiAgfCAnYWk6bWVzc2FnZS1yZWNlaXZlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1zdGFydGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWNvbXBsZXRlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1lcnJvcic7XG5cbnR5cGUgSXBjQ2hhbm5lbHMgPSBQcmVzZW50YXRpb25DaGFubmVscyB8IEFJQ2hhbm5lbHMgfCBBdXRoQ2hhbm5lbHM7XG5cbmNvbnN0IGVsZWN0cm9uSGFuZGxlciA9IHtcbiAgaXBjUmVuZGVyZXI6IHtcbiAgICBzZW5kTWVzc2FnZShjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgaXBjUmVuZGVyZXIuc2VuZChjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uKGNoYW5uZWw6IElwY0NoYW5uZWxzLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSAoX2V2ZW50OiBJcGNSZW5kZXJlckV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICAgIGZ1bmMoLi4uYXJncyk7XG4gICAgICBpcGNSZW5kZXJlci5vbihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9uY2UoY2hhbm5lbDogSXBjQ2hhbm5lbHMsIGZ1bmM6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpIHtcbiAgICAgIGlwY1JlbmRlcmVyLm9uY2UoY2hhbm5lbCwgKF9ldmVudCwgLi4uYXJncykgPT4gZnVuYyguLi5hcmdzKSk7XG4gICAgfSxcbiAgfSxcbiAgXG4gIGF1dGg6IHtcbiAgICBsb2dpbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9naW4nKTtcbiAgICB9LFxuICAgIGxvZ291dCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9nb3V0Jyk7XG4gICAgfSxcbiAgICBnZXRVc2VyKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpnZXQtdXNlcicpO1xuICAgIH0sXG4gICAgcmVmcmVzaFRva2VucygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6cmVmcmVzaC10b2tlbnMnKTtcbiAgICB9LFxuICAgIGdldEJhbGFuY2UoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhdXRoOmdldC1iYWxhbmNlJyk7XG4gICAgfVxuICB9LFxuICBcbiAgYWk6IHtcbiAgICBjcmVhdGVUaHJlYWQodGl0bGU6IHN0cmluZywgcHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Y3JlYXRlLXRocmVhZCcsIHRpdGxlLCBwcmVzZW50YXRpb25JZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Z2V0LXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNhdmVUaHJlYWQodGhyZWFkOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzYXZlLXRocmVhZCcsIHRocmVhZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRzRm9yUHJlc2VudGF0aW9uKHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdhaTpnZXQtdGhyZWFkcy1mb3ItcHJlc2VudGF0aW9uJyxcbiAgICAgICAgcHJlc2VudGF0aW9uSWQsXG4gICAgICApO1xuICAgIH0sXG4gICAgZGVsZXRlVGhyZWFkKHRocmVhZElkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOmRlbGV0ZS10aHJlYWQnLCB0aHJlYWRJZCk7XG4gICAgfSxcbiAgICBzZW5kTWVzc2FnZShyZXF1ZXN0OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzZW5kLW1lc3NhZ2UnLCByZXF1ZXN0KTtcbiAgICB9LFxuICB9LFxuXG4gIHByZXNlbnRhdGlvbjoge1xuICAgIGluaXRpYWxpemVQcmVzZW50YXRpb24odGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmluaXRpYWxpemUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBnZXRQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0Jyk7XG4gICAgfSxcbiAgICB1cGRhdGVNZXRhKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGFkZFNsaWRlKHRpdGxlPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLXNsaWRlJywgdGl0bGUpO1xuICAgIH0sXG4gICAgdXBkYXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJywgc2xpZGVJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBkZWxldGVTbGlkZShzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnLCBzbGlkZUlkKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQoc2xpZGVJZDogc3RyaW5nLCBlbGVtZW50OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnLCBzbGlkZUlkLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHVwZGF0ZUVsZW1lbnQoZWxlbWVudElkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnLFxuICAgICAgICBlbGVtZW50SWQsXG4gICAgICAgIHVwZGF0ZXMsXG4gICAgICApO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlJyk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uQXMoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZS1hcycpO1xuICAgIH0sXG4gICAgbG9hZFByZXNlbnRhdGlvbihmaWxlUGF0aD86IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmxvYWQnLCBmaWxlUGF0aCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RmlsZVBhdGgoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0LWZpbGUtcGF0aCcpO1xuICAgIH0sXG4gICAgb3BlbkZ1bGxzY3JlZW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246b3Blbi1mdWxsc2NyZWVuJyk7XG4gICAgfSxcbiAgICBjbG9zZUZ1bGxzY3JlZW4oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Y2xvc2UtZnVsbHNjcmVlbicpO1xuICAgIH0sXG4gICAgaXNGdWxsc2NyZWVuT3BlbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjppcy1mdWxsc2NyZWVuLW9wZW4nKTtcbiAgICB9LFxuICB9LFxufTtcblxuY29udGV4dEJyaWRnZS5leHBvc2VJbk1haW5Xb3JsZCgnZWxlY3Ryb24nLCBlbGVjdHJvbkhhbmRsZXIpO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9
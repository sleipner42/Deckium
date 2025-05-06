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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O1lBQzNDLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFDRCxXQUFXLENBQUMsT0FBZTtZQUN6QixPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDRCxVQUFVLENBQUMsT0FBZSxFQUFFLE9BQWdCO1lBQzFDLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxhQUFhLENBQUMsU0FBaUIsRUFBRSxPQUFnQjtZQUMvQyxPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUN2Qiw2QkFBNkIsRUFDN0IsU0FBUyxFQUNULE9BQU8sQ0FDUixDQUFDO1FBQ0osQ0FBQztRQUNELGdCQUFnQjtZQUNkLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsZ0JBQWdCLENBQUMsUUFBaUI7WUFDaEMsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsd0JBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImVsZWN0cm9uXCIiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvLi9zcmMvbWFpbi9wcmVsb2FkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSB7XG5cdFx0dmFyIGEgPSBmYWN0b3J5KCk7XG5cdFx0Zm9yKHZhciBpIGluIGEpICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgPyBleHBvcnRzIDogcm9vdClbaV0gPSBhW2ldO1xuXHR9XG59KShnbG9iYWwsICgpID0+IHtcbnJldHVybiAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiaW1wb3J0IHsgY29udGV4dEJyaWRnZSwgaXBjUmVuZGVyZXIsIElwY1JlbmRlcmVyRXZlbnQgfSBmcm9tICdlbGVjdHJvbic7XG5cbmV4cG9ydCB0eXBlIFByZXNlbnRhdGlvbkNoYW5uZWxzID1cbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpnZXQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZS1hcydcbiAgfCAncHJlc2VudGF0aW9uOmxvYWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1hZGRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1kZWxldGVkJ1xuICB8ICdwcmVzZW50YXRpb246bWV0YS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzZXQtc2VsZWN0ZWQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlZCdcbiAgfCAncHJlc2VudGF0aW9uOmxvYWRlZCc7XG5cbmV4cG9ydCB0eXBlIEFJQ2hhbm5lbHMgPVxuICB8ICdhaTpjcmVhdGUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkJ1xuICB8ICdhaTpzYXZlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbidcbiAgfCAnYWk6ZGVsZXRlLXRocmVhZCdcbiAgfCAnYWk6c2VuZC1tZXNzYWdlJ1xuICB8ICdhaTp0aHJlYWQtY3JlYXRlZCdcbiAgfCAnYWk6dGhyZWFkLXVwZGF0ZWQnXG4gIHwgJ2FpOnRocmVhZC1kZWxldGVkJ1xuICB8ICdhaTptZXNzYWdlLXJlY2VpdmVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLXN0YXJ0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctY29tcGxldGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWVycm9yJztcblxuY29uc3QgZWxlY3Ryb25IYW5kbGVyID0ge1xuICBpcGNSZW5kZXJlcjoge1xuICAgIHNlbmRNZXNzYWdlKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb24oY2hhbm5lbDogc3RyaW5nLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSAoX2V2ZW50OiBJcGNSZW5kZXJlckV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICAgIGZ1bmMoLi4uYXJncyk7XG4gICAgICBpcGNSZW5kZXJlci5vbihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9uY2UoY2hhbm5lbDogc3RyaW5nLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBpcGNSZW5kZXJlci5vbmNlKGNoYW5uZWwsIChfZXZlbnQsIC4uLmFyZ3MpID0+IGZ1bmMoLi4uYXJncykpO1xuICAgIH0sXG4gIH0sXG5cbiAgYWk6IHtcbiAgICBjcmVhdGVUaHJlYWQodGl0bGU6IHN0cmluZywgcHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Y3JlYXRlLXRocmVhZCcsIHRpdGxlLCBwcmVzZW50YXRpb25JZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Z2V0LXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNhdmVUaHJlYWQodGhyZWFkOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzYXZlLXRocmVhZCcsIHRocmVhZCk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRzRm9yUHJlc2VudGF0aW9uKHByZXNlbnRhdGlvbklkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdhaTpnZXQtdGhyZWFkcy1mb3ItcHJlc2VudGF0aW9uJyxcbiAgICAgICAgcHJlc2VudGF0aW9uSWQsXG4gICAgICApO1xuICAgIH0sXG4gICAgZGVsZXRlVGhyZWFkKHRocmVhZElkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOmRlbGV0ZS10aHJlYWQnLCB0aHJlYWRJZCk7XG4gICAgfSxcbiAgICBzZW5kTWVzc2FnZShyZXF1ZXN0OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpzZW5kLW1lc3NhZ2UnLCByZXF1ZXN0KTtcbiAgICB9LFxuICB9LFxuXG4gIHByZXNlbnRhdGlvbjoge1xuICAgIGluaXRpYWxpemVQcmVzZW50YXRpb24odGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmluaXRpYWxpemUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICBnZXRQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0Jyk7XG4gICAgfSxcbiAgICB1cGRhdGVNZXRhKHRpdGxlOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGFkZFNsaWRlKHRpdGxlPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLXNsaWRlJywgdGl0bGUpO1xuICAgIH0sXG4gICAgdXBkYXRlU2xpZGUoc2xpZGVJZDogc3RyaW5nLCB1cGRhdGVzOiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246dXBkYXRlLXNsaWRlJywgc2xpZGVJZCwgdXBkYXRlcyk7XG4gICAgfSxcbiAgICBkZWxldGVTbGlkZShzbGlkZUlkOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnLCBzbGlkZUlkKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQoc2xpZGVJZDogc3RyaW5nLCBlbGVtZW50OiB1bmtub3duKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246YWRkLWVsZW1lbnQnLCBzbGlkZUlkLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHVwZGF0ZUVsZW1lbnQoZWxlbWVudElkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoXG4gICAgICAgICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnLFxuICAgICAgICBlbGVtZW50SWQsXG4gICAgICAgIHVwZGF0ZXMsXG4gICAgICApO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlJyk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uQXMoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZS1hcycpO1xuICAgIH0sXG4gICAgbG9hZFByZXNlbnRhdGlvbihmaWxlUGF0aD86IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmxvYWQnLCBmaWxlUGF0aCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RmlsZVBhdGgoKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246Z2V0LWZpbGUtcGF0aCcpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbicsIGVsZWN0cm9uSGFuZGxlcik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=

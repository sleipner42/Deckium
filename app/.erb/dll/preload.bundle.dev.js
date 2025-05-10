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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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bUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsd0JBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImVsZWN0cm9uXCIiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvLi9zcmMvbWFpbi9wcmVsb2FkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSB7XG5cdFx0dmFyIGEgPSBmYWN0b3J5KCk7XG5cdFx0Zm9yKHZhciBpIGluIGEpICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgPyBleHBvcnRzIDogcm9vdClbaV0gPSBhW2ldO1xuXHR9XG59KShnbG9iYWwsICgpID0+IHtcbnJldHVybiAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiaW1wb3J0IHsgY29udGV4dEJyaWRnZSwgaXBjUmVuZGVyZXIsIElwY1JlbmRlcmVyRXZlbnQgfSBmcm9tICdlbGVjdHJvbic7XG5pbXBvcnQgeyBBdXRoQ2hhbm5lbHMgfSBmcm9tICcuLi9jb21tb24vZG9tYWluL2ludGVyZmFjZXMvYXV0aC5pbnRlcmZhY2UnO1xuXG5leHBvcnQgdHlwZSBQcmVzZW50YXRpb25DaGFubmVscyA9XG4gIHwgJ3ByZXNlbnRhdGlvbjppbml0aWFsaXplJ1xuICB8ICdwcmVzZW50YXRpb246Z2V0J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLW1ldGEnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpkZWxldGUtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246c2F2ZSdcbiAgfCAncHJlc2VudGF0aW9uOnNhdmUtYXMnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtYWRkZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246c2xpZGUtZGVsZXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOm1ldGEtdXBkYXRlZCdcbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemVkJ1xuICB8ICdwcmVzZW50YXRpb246c2V0LXNlbGVjdGVkLXNsaWRlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpsb2FkZWQnO1xuXG5leHBvcnQgdHlwZSBBSUNoYW5uZWxzID1cbiAgfCAnYWk6Y3JlYXRlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZCdcbiAgfCAnYWk6c2F2ZS10aHJlYWQnXG4gIHwgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nXG4gIHwgJ2FpOmRlbGV0ZS10aHJlYWQnXG4gIHwgJ2FpOnNlbmQtbWVzc2FnZSdcbiAgfCAnYWk6dGhyZWFkLWNyZWF0ZWQnXG4gIHwgJ2FpOnRocmVhZC11cGRhdGVkJ1xuICB8ICdhaTp0aHJlYWQtZGVsZXRlZCdcbiAgfCAnYWk6bWVzc2FnZS1yZWNlaXZlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1zdGFydGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWNvbXBsZXRlZCdcbiAgfCAnYWk6cHJvY2Vzc2luZy1lcnJvcic7XG5cbnR5cGUgSXBjQ2hhbm5lbHMgPSBQcmVzZW50YXRpb25DaGFubmVscyB8IEFJQ2hhbm5lbHMgfCBBdXRoQ2hhbm5lbHM7XG5cbmNvbnN0IGVsZWN0cm9uSGFuZGxlciA9IHtcbiAgaXBjUmVuZGVyZXI6IHtcbiAgICBzZW5kTWVzc2FnZShjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgaXBjUmVuZGVyZXIuc2VuZChjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uKGNoYW5uZWw6IElwY0NoYW5uZWxzLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSAoX2V2ZW50OiBJcGNSZW5kZXJlckV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICAgIGZ1bmMoLi4uYXJncyk7XG4gICAgICBpcGNSZW5kZXJlci5vbihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9uY2UoY2hhbm5lbDogSXBjQ2hhbm5lbHMsIGZ1bmM6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpIHtcbiAgICAgIGlwY1JlbmRlcmVyLm9uY2UoY2hhbm5lbCwgKF9ldmVudCwgLi4uYXJncykgPT4gZnVuYyguLi5hcmdzKSk7XG4gICAgfSxcbiAgfSxcbiAgXG4gIGF1dGg6IHtcbiAgICBsb2dpbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9naW4nKTtcbiAgICB9LFxuICAgIGxvZ291dCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6bG9nb3V0Jyk7XG4gICAgfSxcbiAgICBnZXRVc2VyKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYXV0aDpnZXQtdXNlcicpO1xuICAgIH0sXG4gICAgcmVmcmVzaFRva2VucygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2F1dGg6cmVmcmVzaC10b2tlbnMnKTtcbiAgICB9XG4gIH0sXG4gIFxuICBhaToge1xuICAgIGNyZWF0ZVRocmVhZCh0aXRsZTogc3RyaW5nLCBwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNhdmUtdGhyZWFkJywgdGhyZWFkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZHNGb3JQcmVzZW50YXRpb24ocHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ2FpOmdldC10aHJlYWRzLWZvci1wcmVzZW50YXRpb24nLFxuICAgICAgICBwcmVzZW50YXRpb25JZCxcbiAgICAgICk7XG4gICAgfSxcbiAgICBkZWxldGVUaHJlYWQodGhyZWFkSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6ZGVsZXRlLXRocmVhZCcsIHRocmVhZElkKTtcbiAgICB9LFxuICAgIHNlbmRNZXNzYWdlKHJlcXVlc3Q6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNlbmQtbWVzc2FnZScsIHJlcXVlc3QpO1xuICAgIH0sXG4gIH0sXG5cbiAgcHJlc2VudGF0aW9uOiB7XG4gICAgaW5pdGlhbGl6ZVByZXNlbnRhdGlvbih0aXRsZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246aW5pdGlhbGl6ZScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGdldFByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQnKTtcbiAgICB9LFxuICAgIHVwZGF0ZU1ldGEodGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnVwZGF0ZS1tZXRhJywgdGl0bGUpO1xuICAgIH0sXG4gICAgYWRkU2xpZGUodGl0bGU/OiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICB1cGRhdGVTbGlkZShzbGlkZUlkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnLCBzbGlkZUlkLCB1cGRhdGVzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVNsaWRlKHNsaWRlSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZScsIHNsaWRlSWQpO1xuICAgIH0sXG4gICAgYWRkRWxlbWVudChzbGlkZUlkOiBzdHJpbmcsIGVsZW1lbnQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCcsIHNsaWRlSWQsIGVsZW1lbnQpO1xuICAgIH0sXG4gICAgdXBkYXRlRWxlbWVudChlbGVtZW50SWQ6IHN0cmluZywgdXBkYXRlczogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZShcbiAgICAgICAgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtZWxlbWVudCcsXG4gICAgICAgIGVsZW1lbnRJZCxcbiAgICAgICAgdXBkYXRlcyxcbiAgICAgICk7XG4gICAgfSxcbiAgICBzYXZlUHJlc2VudGF0aW9uKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnNhdmUnKTtcbiAgICB9LFxuICAgIHNhdmVQcmVzZW50YXRpb25BcygpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpzYXZlLWFzJyk7XG4gICAgfSxcbiAgICBsb2FkUHJlc2VudGF0aW9uKGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246bG9hZCcsIGZpbGVQYXRoKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRGaWxlUGF0aCgpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQtZmlsZS1wYXRoJyk7XG4gICAgfSxcbiAgfSxcbn07XG5cbmNvbnRleHRCcmlkZ2UuZXhwb3NlSW5NYWluV29ybGQoJ2VsZWN0cm9uJywgZWxlY3Ryb25IYW5kbGVyKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==
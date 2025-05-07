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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RUFBRSxPQUFnQjtZQUMzQyxPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsV0FBVyxDQUFDLE9BQWU7WUFDekIsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQ0QsVUFBVSxDQUFDLE9BQWUsRUFBRSxPQUFnQjtZQUMxQyxPQUFPLHNCQUFXLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsYUFBYSxDQUFDLFNBQWlCLEVBQUUsT0FBZ0I7WUFDL0MsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0UsQ0FBQztRQUNELGdCQUFnQjtZQUNkLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsZ0JBQWdCLENBQUMsUUFBaUI7WUFDaEMsT0FBTyxzQkFBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0Qsa0JBQWtCO1lBQ2hCLE9BQU8sc0JBQVcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsd0JBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9lbGVjdHJvbi1yZWFjdC1ib2lsZXJwbGF0ZS93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImVsZWN0cm9uXCIiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZWxlY3Ryb24tcmVhY3QtYm9pbGVycGxhdGUvLi9zcmMvbWFpbi9wcmVsb2FkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSB7XG5cdFx0dmFyIGEgPSBmYWN0b3J5KCk7XG5cdFx0Zm9yKHZhciBpIGluIGEpICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgPyBleHBvcnRzIDogcm9vdClbaV0gPSBhW2ldO1xuXHR9XG59KShnbG9iYWwsICgpID0+IHtcbnJldHVybiAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiaW1wb3J0IHsgY29udGV4dEJyaWRnZSwgaXBjUmVuZGVyZXIsIElwY1JlbmRlcmVyRXZlbnQgfSBmcm9tICdlbGVjdHJvbic7XG5cbmV4cG9ydCB0eXBlIFByZXNlbnRhdGlvbkNoYW5uZWxzID1cbiAgfCAncHJlc2VudGF0aW9uOmluaXRpYWxpemUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpnZXQnXG4gIHwgJ3ByZXNlbnRhdGlvbjp1cGRhdGUtbWV0YSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOnVwZGF0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZSdcbiAgfCAncHJlc2VudGF0aW9uOmFkZC1lbGVtZW50J1xuICB8ICdwcmVzZW50YXRpb246dXBkYXRlLWVsZW1lbnQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlJ1xuICB8ICdwcmVzZW50YXRpb246c2F2ZS1hcydcbiAgfCAncHJlc2VudGF0aW9uOmxvYWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1hZGRlZCdcbiAgfCAncHJlc2VudGF0aW9uOnNsaWRlLXVwZGF0ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzbGlkZS1kZWxldGVkJ1xuICB8ICdwcmVzZW50YXRpb246bWV0YS11cGRhdGVkJ1xuICB8ICdwcmVzZW50YXRpb246aW5pdGlhbGl6ZWQnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzZXQtc2VsZWN0ZWQtc2xpZGUnXG4gIHwgJ3ByZXNlbnRhdGlvbjpzYXZlZCdcbiAgfCAncHJlc2VudGF0aW9uOmxvYWRlZCc7XG5cbmV4cG9ydCB0eXBlIEFJQ2hhbm5lbHMgPVxuICB8ICdhaTpjcmVhdGUtdGhyZWFkJ1xuICB8ICdhaTpnZXQtdGhyZWFkJ1xuICB8ICdhaTpzYXZlLXRocmVhZCdcbiAgfCAnYWk6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbidcbiAgfCAnYWk6ZGVsZXRlLXRocmVhZCdcbiAgfCAnYWk6c2VuZC1tZXNzYWdlJ1xuICB8ICdhaTp0aHJlYWQtY3JlYXRlZCdcbiAgfCAnYWk6dGhyZWFkLXVwZGF0ZWQnXG4gIHwgJ2FpOnRocmVhZC1kZWxldGVkJ1xuICB8ICdhaTptZXNzYWdlLXJlY2VpdmVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLXN0YXJ0ZWQnXG4gIHwgJ2FpOnByb2Nlc3NpbmctY29tcGxldGVkJ1xuICB8ICdhaTpwcm9jZXNzaW5nLWVycm9yJztcblxuY29uc3QgZWxlY3Ryb25IYW5kbGVyID0ge1xuICBpcGNSZW5kZXJlcjoge1xuICAgIHNlbmRNZXNzYWdlKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb24oY2hhbm5lbDogc3RyaW5nLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSAoX2V2ZW50OiBJcGNSZW5kZXJlckV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICAgIGZ1bmMoLi4uYXJncyk7XG4gICAgICBpcGNSZW5kZXJlci5vbihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9uY2UoY2hhbm5lbDogc3RyaW5nLCBmdW5jOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSB7XG4gICAgICBpcGNSZW5kZXJlci5vbmNlKGNoYW5uZWwsIChfZXZlbnQsIC4uLmFyZ3MpID0+IGZ1bmMoLi4uYXJncykpO1xuICAgIH0sXG4gIH0sXG4gIFxuICBhaToge1xuICAgIGNyZWF0ZVRocmVhZCh0aXRsZTogc3RyaW5nLCBwcmVzZW50YXRpb25JZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpjcmVhdGUtdGhyZWFkJywgdGl0bGUsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpnZXQtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2F2ZVRocmVhZCh0aHJlYWQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ2FpOnNhdmUtdGhyZWFkJywgdGhyZWFkKTtcbiAgICB9LFxuICAgIGdldFRocmVhZHNGb3JQcmVzZW50YXRpb24ocHJlc2VudGF0aW9uSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6Z2V0LXRocmVhZHMtZm9yLXByZXNlbnRhdGlvbicsIHByZXNlbnRhdGlvbklkKTtcbiAgICB9LFxuICAgIGRlbGV0ZVRocmVhZCh0aHJlYWRJZDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdhaTpkZWxldGUtdGhyZWFkJywgdGhyZWFkSWQpO1xuICAgIH0sXG4gICAgc2VuZE1lc3NhZ2UocmVxdWVzdDogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgnYWk6c2VuZC1tZXNzYWdlJywgcmVxdWVzdCk7XG4gICAgfVxuICB9LFxuICBcbiAgcHJlc2VudGF0aW9uOiB7XG4gICAgaW5pdGlhbGl6ZVByZXNlbnRhdGlvbih0aXRsZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246aW5pdGlhbGl6ZScsIHRpdGxlKTtcbiAgICB9LFxuICAgIGdldFByZXNlbnRhdGlvbigpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpnZXQnKTtcbiAgICB9LFxuICAgIHVwZGF0ZU1ldGEodGl0bGU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnVwZGF0ZS1tZXRhJywgdGl0bGUpO1xuICAgIH0sXG4gICAgYWRkU2xpZGUodGl0bGU/OiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtc2xpZGUnLCB0aXRsZSk7XG4gICAgfSxcbiAgICB1cGRhdGVTbGlkZShzbGlkZUlkOiBzdHJpbmcsIHVwZGF0ZXM6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjp1cGRhdGUtc2xpZGUnLCBzbGlkZUlkLCB1cGRhdGVzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVNsaWRlKHNsaWRlSWQ6IHN0cmluZykge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmRlbGV0ZS1zbGlkZScsIHNsaWRlSWQpO1xuICAgIH0sXG4gICAgYWRkRWxlbWVudChzbGlkZUlkOiBzdHJpbmcsIGVsZW1lbnQ6IHVua25vd24pIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjphZGQtZWxlbWVudCcsIHNsaWRlSWQsIGVsZW1lbnQpO1xuICAgIH0sXG4gICAgdXBkYXRlRWxlbWVudChlbGVtZW50SWQ6IHN0cmluZywgdXBkYXRlczogdW5rbm93bikge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnVwZGF0ZS1lbGVtZW50JywgZWxlbWVudElkLCB1cGRhdGVzKTtcbiAgICB9LFxuICAgIHNhdmVQcmVzZW50YXRpb24oKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKCdwcmVzZW50YXRpb246c2F2ZScpO1xuICAgIH0sXG4gICAgc2F2ZVByZXNlbnRhdGlvbkFzKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOnNhdmUtYXMnKTtcbiAgICB9LFxuICAgIGxvYWRQcmVzZW50YXRpb24oZmlsZVBhdGg/OiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5pbnZva2UoJ3ByZXNlbnRhdGlvbjpsb2FkJywgZmlsZVBhdGgpO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudEZpbGVQYXRoKCkge1xuICAgICAgcmV0dXJuIGlwY1JlbmRlcmVyLmludm9rZSgncHJlc2VudGF0aW9uOmdldC1maWxlLXBhdGgnKTtcbiAgICB9XG4gIH0sXG59O1xuXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbicsIGVsZWN0cm9uSGFuZGxlcik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=
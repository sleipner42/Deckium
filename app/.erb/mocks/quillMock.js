// Quill v2 ships as ESM and pulls in ESM-only deps that jsdom/ts-jest cannot
// parse. Component tests don't exercise the editor, so provide a minimal stand-in
// that satisfies the module-load-time calls in TextElement (import/register) and
// the instance API touched during render.
class Quill {
    static import() {
        return class {};
    }

    static register() {}

    constructor() {}

    on() {}

    off() {}

    enable() {}

    disable() {}

    getModule() {
        return { container: document.createElement('div') };
    }

    getSelection() {
        return null;
    }

    getFormat() {
        return {};
    }

    setContents() {}

    root = document.createElement('div');
}

module.exports = Quill;
module.exports.default = Quill;

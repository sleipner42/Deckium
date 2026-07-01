// plotly.js pulls in mapbox-gl, which cannot load under jsdom. Component tests
// only need a stand-in element, so mock react-plotly.js with a no-op component.
module.exports = () => null;
module.exports.default = () => null;

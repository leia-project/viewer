import {
	Color,
	defaultValue,
	defined,
	Event,
	Ellipsoid,
	WebMercatorTilingScheme
} from 'cesium';

import * as tilekiln from "tile-kiln";
/**
 * @typedef {Object} VectorImageryProvider.ConstructorOptions
 *
 * Initialization options for the TileCoordinatesImageryProvider constructor
 *
 * @property {TilingScheme} [tilingScheme=new WebMercatorTilingScheme()] The tiling scheme for which to draw tiles.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the WGS84 ellipsoid is used.
 * @property {Color} [color=Color.YELLOW] The color to draw the tile box and label.
 * @property {Number} [tileWidth=256] The width of the tile for level-of-detail selection purposes.
 * @property {Number} [tileHeight=256] The height of the tile for level-of-detail selection purposes.
 */

/**
 * An {@link ImageryProvider} that draws a box around every rendered tile in the tiling scheme, and draws
 * a label inside it indicating the X, Y, Level coordinates of the tile.  This is mostly useful for
 * debugging terrain and imagery rendering problems.
 *
 * @alias VectorImageryProvider
 * @constructor
 *
 * @param {VectorImageryProvider.ConstructorOptions} [options] Object describing initialization options
 */
function VectorImageryProvider(this: any, url: string, options: any) {
	options = defaultValue(options, {});
	this.url = url;
	this._tilingScheme = defined(options.tilingScheme)
		? options.tilingScheme
		: new WebMercatorTilingScheme({ ellipsoid: Ellipsoid.WGS84 });
	this._color = defaultValue(options.color, Color.YELLOW);
	this._errorEvent = new Event();
	this._tileWidth = defaultValue(options.tileWidth, 512);
	this._tileHeight = defaultValue(options.tileHeight, 512);
	this._readyPromise = this.setupTileMaker(url);
	this._ready = false;

	this.defaultAlpha = undefined;
	this.defaultNightAlpha = undefined;
	this.defaultDayAlpha = undefined;
	this.defaultBrightness = undefined;
	this.defaultContrast = undefined;
	this.defaultHue = undefined;
	this.defaultSaturation = undefined;
	this.defaultGamma = undefined;
	this.defaultMinificationFilter = undefined;
	this.defaultMagnificationFilter = undefined;
}

Object.defineProperties(VectorImageryProvider.prototype, {
	proxy: {
		get: function () {
			return undefined;
		}
	},

	tileWidth: {
		get: function () {
			return this._tileWidth;
		}
	},

	tileHeight: {
		get: function () {
			return this._tileHeight;
		}
	},

	maximumLevel: {
		get: function () {
			return 22;
		}
	},

	minimumLevel: {
		get: function () {
			return undefined;
		}
	},

	tilingScheme: {
		get: function () {
			return this._tilingScheme;
		}
	},

	rectangle: {
		get: function () {
			return this._tilingScheme.rectangle;
		}
	},

	tileDiscardPolicy: {
		get: function () {
			return undefined;
		}
	},

	errorEvent: {
		get: function () {
			return this._errorEvent;
		}
	},

	ready: {
		get: function () {
			return this._ready;
		}
	},

	readyPromise: {
		get: function () {
			return this._readyPromise;
		}
	},

	credit: {
		get: function () {
			return undefined;
		}
	},

	hasAlphaChannel: {
		get: function () {
			return true;
		}
	}
});

VectorImageryProvider.prototype.setupTileMaker = async function (url: string) {
	const setup = (url: string) => {
		return new Promise<void>((resolve, reject) => {
			this.tileMaker = tilekiln.init({
				size: 512,
				style: url,
				callback: (err: unknown, api: unknown) => { 
					if (err) {
						reject();
					}

					this._ready = true;
					resolve();
				},
			});
		})
	}

	return await setup(url);
};

VectorImageryProvider.prototype.getTileCredits = function (x: number, y: number, level: number) {
	return undefined;
};

VectorImageryProvider.prototype.requestImage = async function (x: number, y: number, level: number, request: unknown) {
	//console.log(request);
	let vectorTile: any;

	const getImage = (x: number, y: number, level: number) => {
		return new Promise<void>((resolve, reject) => {
			this.tileMaker.create(level, x, y, (error: unknown, tile: unknown) => {
				vectorTile = tile;
				resolve();
			});
		})
	}

	await getImage(x, y, level);

	return Promise.resolve(vectorTile.img);
};

VectorImageryProvider.prototype.pickFeatures = function (x: number, y: number, level: number, longitude: number, latitude: number) {
	return undefined;
};

export default VectorImageryProvider;
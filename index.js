const chalk = require("chalk");

class LargeImgWarningPlugin {
    constructor(limit = 300) {
        this.limit = limit * 1024;
        // 以kb为单位的limit
        this._limit = limit;
        // 记录压缩前后所有图片的大小，计算压缩比率
        this._totalOriginalImagesSize = 0;
        this._totalCompressedImagesSize = 0;
        // warning字符串，把所有图片的warning都拼接起来，方便用户查看
        this._warnings = "";
    }

    apply(compiler) {
        let imgRe = /\.(png|jpe?g|gif|svg|webp)$/;
        const emit = (compilation, cb) => {
            let errors = [];

            Object.keys(compilation.assets).forEach(filename => {
                let buffer = compilation.assets[filename]._value;

                if (imgRe.test(filename)) {
                    // 统计压缩后的图片大小
                    this._totalCompressedImagesSize += buffer.length;
                    // 图片超过限定值提示
                    if (buffer.length > this.limit) {
                        this.assembleWarning(
                            `${chalk.green(filename)} 当前大小为 ${chalk.red(
                                this.convertUnit(buffer.length)
                            )}`
                        );
                    }
                }
            });
            // 统计压缩效率
            let compressedSize =
                this._totalOriginalImagesSize - this._totalCompressedImagesSize;
            let compressedSizeWithUnit = this.convertUnit(
                this._totalOriginalImagesSize - this._totalCompressedImagesSize
            );
            let compressedRate =
                (
                    (compressedSize / this._totalOriginalImagesSize) *
                    100
                ).toFixed(2) + "%";
            if (compressedSize > 0) {
                // 暂时把压缩统计也放到warning里，有更合适的地方再移出去
                this.assembleWarning(
                    `\n\n  图片共计压缩 ${chalk.green(
                        compressedSizeWithUnit
                    )}, 压缩率为 ${chalk.green(compressedRate)}`
                );
            }

            if (this._warnings) {
                compilation.warnings.push(this._warnings);
            }
            if (errors.length) {
                compilation.errors = compilation.errors.concat(errors);
            }
            cb();
        };

        const countOriginalImgsSize = (assets, cb) => {
            Object.keys(assets).forEach(filename => {
                let buffer = assets[filename]._value;

                if (imgRe.test(filename)) {
                    this._totalOriginalImagesSize += buffer.length;
                }
            });

            cb();
        };

        compiler.plugin("emit", emit);
        compiler.plugin("compilation", compilation => {
            compilation.plugin("optimize-chunk-assets", (chunks, cb) => {
                countOriginalImgsSize(compilation.assets, cb);
            });
        });
    }

    convertUnit(size) {
        // 1024 * 1024 = 1048576
        if (size < 1048576) {
            return (size / 1024).toFixed(1) + "kb";
        } else {
            return (size / 1048576).toFixed(1) + "m";
        }
    }

    assembleWarning(warning) {
        // 加标题
        if (!this._warnings) {
            this._warnings = `${chalk.blue(
                "[LargeImgWarningPlugin]"
            )} 以下图片体积查过${chalk.yellow(this._limit) +
                "kb"}，请酌情考虑压缩图片:\n\n`;
        }

        this._warnings += `  ${warning}\n`;
    }
}

module.exports = LargeImgWarningPlugin;

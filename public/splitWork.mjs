import { mulBigIntByNum } from './bigIntArithHelper.mjs';

const minToSplit = 32;

/**
 * @param coords {Coords}
 * @param canvasCoords {CanvasCoords}
 * @param depth {number}
 * @return {Generator<{coords: Coords, canvasCoords: CanvasCoords}>}
 */
export function* splitWork(coords, canvasCoords, depth) {
    // noinspection JSValidateTypes
    if (depth > 0 && (canvasCoords.w > minToSplit || canvasCoords.h > minToSplit)) {
        if (canvasCoords.w > canvasCoords.h) {
            const canvasXMid = Math.round(canvasCoords.xMin + canvasCoords.w / 2);
            const canvasLeftW = canvasXMid - canvasCoords.xMin;
            const leftFraction = canvasLeftW / canvasCoords.w;
            const leftW = mulBigIntByNum(coords.w, leftFraction);

            yield* splitWork(
                {
                    ...coords,
                    w: leftW,
                },
                {
                    ...canvasCoords,
                    w: canvasLeftW,
                },
                depth - 1,
            );
            yield* splitWork(
                {
                    ...coords,
                    xMin: coords.xMin + leftW,
                    w: coords.w - leftW,
                },{
                    ...canvasCoords,
                    xMin: canvasXMid,
                    w: canvasCoords.w - canvasLeftW,
                },
                depth - 1,
            );
            // noinspection JSValidateTypes
            return;
        }

        const canvasYMid = Math.round(canvasCoords.yMin + canvasCoords.h / 2);
        const canvasUpperH = canvasYMid - canvasCoords.yMin;
        const upperFraction = canvasUpperH / canvasCoords.h;
        const upperH = mulBigIntByNum(coords.h, upperFraction);
        yield* splitWork(
            {
                ...coords,
                h: upperH,
            },
            {
                ...canvasCoords,
                h: canvasUpperH,
            },
            depth - 1,
        );
        yield* splitWork(
            {
                ...coords,
                yMin: coords.yMin + upperH,
                h: coords.h - upperH,
            },
            {
                ...canvasCoords,
                yMin: canvasYMid,
                h: canvasCoords.h - canvasUpperH,
            },
            depth - 1,
        );
        // noinspection JSValidateTypes
        return;
    }

    yield {
        coords,
        canvasCoords,
    };
}

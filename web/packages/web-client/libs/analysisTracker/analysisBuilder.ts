type analysisItem = {
    next?: analysisItem[],
    previous?: analysisItem[],
    data: any,
    idx?: number
}

// Analysis chains are linear; this specifies the sequential dependency pipeline
// However, and individual analysis can have a branching graph
// where branches represent sibling dependencies that can be run in parallel (in Ray or Pipeline say)
let mainTrunk: analysisItem[] = [];

export const addNode = (stuff: analysisItem, insertBeforeIdx?: number): any => {
    const idx = mainTrunk.length;

    if (!insertBeforeIdx || mainTrunk.length === 0) {
        mainTrunk.push(Object.assign({}, stuff, { idx }));
        return [mainTrunk[idx], idx];
    }

    if (insertBeforeIdx >= 0) {
        const idx = +insertBeforeIdx;
        mainTrunk[idx]['idx'] = idx + 1;
        mainTrunk.splice(idx, 0, Object.assign({}, stuff, { idx }));

        return [mainTrunk[idx], idx];
    }



    console.info("maintrunk", mainTrunk);

}


export const removeNode = (idx: number) => mainTrunk.splice(idx, 1);

export const getNode = (idx: number) => {
    console.info('main trunk', mainTrunk, idx, mainTrunk[idx]);
    if (mainTrunk.length > idx) {
        return mainTrunk[idx];
    }

    return null;
}

export default mainTrunk;
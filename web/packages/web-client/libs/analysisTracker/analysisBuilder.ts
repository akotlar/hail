type analysisItem = {
    next?: analysisItem[],
    previous?: analysisItem[],
    data: any
}

export enum link_type_enum {
    input = 1,
    output,
}

// Analysis chains are linear; this specifies the sequential dependency pipeline
// However, and individual analysis can have a branching graph
// where branches represent sibling dependencies that can be run in parallel (in Ray or Pipeline say)
let mainTrunk: analysisItem[] = [];

export const addNode = (stuff: analysisItem, startIdx?: number, link_type?: link_type_enum): any => {
    if (startIdx === undefined) {
        const newIdx = mainTrunk.length;
        mainTrunk.push(Object.assign({}, stuff));
        return [mainTrunk[newIdx], newIdx];
    }

    if (link_type === undefined) {
        throw new Error("Link type must exist when startIdx does");
    }

    let newElementIdx;
    if (link_type == link_type_enum.input) {
        newElementIdx = +startIdx;
    } else {
        newElementIdx = +startIdx + 1;
    }

    mainTrunk.splice(newElementIdx, 0, Object.assign({}, stuff));
    return [mainTrunk[newElementIdx], newElementIdx];
}


export const removeNode = (idx: number) => mainTrunk.splice(idx, 1);

export const getNode = (idx: number) => {
    console.info('main trunk', mainTrunk, idx, mainTrunk[idx]);
    if (mainTrunk.length > idx) {
        return mainTrunk[idx];
    }

    return null;
}

export const clearNodes = () => {
    mainTrunk = [];
}

export const getNodes = () => {
    return mainTrunk;
}

// type analysisItem = {
//     next?: analysisItem[],
//     previous?: analysisItem[],
//     data: any,
//     idx?: number
// }

// export enum link_type_enum {
//     input = 1,
//     output,
// }

// // Analysis chains are linear; this specifies the sequential dependency pipeline
// // However, and individual analysis can have a branching graph
// // where branches represent sibling dependencies that can be run in parallel (in Ray or Pipeline say)
// let mainTrunk: analysisItem[] = [];

// export const addNode = (stuff: analysisItem, startIdx?: number, beforeAfter?: link_type_enum): any => {
//     if (startIdx === undefined) {
//         const newIdx = mainTrunk.length;

//         mainTrunk.push(Object.assign({}, stuff, { idx: newIdx }));
//         return [mainTrunk[newIdx], newIdx];
//     }

//     console.info("stufff", mainTrunk, startIdx, beforeAfter);

//     // if (beforeAfter == link_type_enum.input) {
//     //     mainTrunk[startIdx]['idx'] = startIdx + 1;
//     //     mainTrunk.splice(startIdx, 0, Object.assign({}, stuff, { idx: startIdx }));
//     // } else {
//     //     mainTrunk[startIdx]['idx'] = startIdx;
//     //     mainTrunk.splice(startIdx + 1, 0, Object.assign({}, stuff, { idx: startIdx }));
//     //     console.info("AFTERRR", mainTrunk);
//     // }


//     // return [mainTrunk[startIdx], startIdx];
// }


// export const removeNode = (idx: number) => mainTrunk.splice(idx, 1);

// export const getNode = (idx: number) => {
//     console.info('main trunk', mainTrunk, idx, mainTrunk[idx]);
//     if (mainTrunk.length > idx) {
//         return mainTrunk[idx];
//     }

//     return null;
// }

// export const clearNodes = () => {
//     mainTrunk = [];
// }

// export default mainTrunk;
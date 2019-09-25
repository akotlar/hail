type struct = {
    next?: struct,
    previous?: struct,
}

let analyses: struct[] = [];

export const addNode = (stuff: any) => analyses.push(stuff);
export const removeNode = (idx: number) => analyses.splice(idx, 1);

export default analyses;
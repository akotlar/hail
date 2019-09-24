import { PureComponent, Fragment } from "react";

type Props = {
    species: string[],
    assemblies: string[],
    onSelected: (assembly: string) => void,
    // inputStage: number
}

type state = {
    selectedSpecie: string,
    selectedAssembly?: string,
    species: string[],
    assemblies: string[],
    cb: (assembly: string) => void,
    // inputStage: number
}
class GenomeSelector extends PureComponent<Props> {
    state: state = {
        selectedSpecie: null,
        selectedAssembly: null,
        species: [],
        assemblies: [],
        cb: null,
        // inputStage: null,

    }

    constructor(props: any) {
        super(props);

        this.state.assemblies = props.assemblies;
        this.state.selectedSpecie = props.species[0];
        this.state.species = props.species;
        // console.info("species", this.state.species);
        this.state.cb = props.onSelected;

        // this.state.inputStage = props.inputStage;
        // console.info('props', this.state);
    }

    render() {
        return (
            <Fragment>
                <h3>Choose a genome</h3>
                <span className='content' style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', marginLeft: 0 }}>
                    {/* <div className="select-wrapper"> */}
                    <select defaultValue={this.state.selectedSpecie}>
                        {this.state.species.map((specie) =>
                            <option key={specie} value={specie}>{specie}</option>
                        )}

                    </select>
                    {/* </div> */}
                    {/* <div className="select-wrapper"> */}
                    <select defaultValue="" onChange={(e: any) => this.state.cb(e.target.value)}>
                        <option disabled value="">Assembly</option>
                        {this.state.assemblies[this.state.selectedSpecie].map((assembly) =>
                            <option key={assembly['value']} value={assembly['value']}>{assembly['name']}</option>
                        )}

                    </select>
                    {/* </div> */}
                </span>
            </Fragment >
        )
    }
}
export default GenomeSelector;
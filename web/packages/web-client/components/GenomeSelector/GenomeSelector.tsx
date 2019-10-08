import { PureComponent, Fragment } from "react";

type Props = {
  species: string[];
  assemblies: string[];
  onSelected: (res: any) => void;
  // inputStage: number
};

type state = {
  idx: number;
  selectedAssembly?: string;
  species: string[];
  assemblies: { name: string; value: { value: string; aliases: string[] } }[][];
  cb: (res: any) => void;
  // inputStage: number
};
class GenomeSelector extends PureComponent<Props> {
  state: state = {
    selectedAssembly: null,
    idx: 0,
    species: [],
    assemblies: [],
    cb: null
    // inputStage: null,
  };

  constructor(props: any) {
    super(props);

    this.state.assemblies = props.assemblies;
    this.state.species = props.species;
    this.state.cb = props.onSelected;
    this.state.idx = 0;

    console.info("PROPS", props.assemblies);

    // this.state.inputStage = props.inputStage;
    // console.info('props', this.state);
  }

  handleSelected = (e: any) => {
    const assembly = e.target.value;
    // stupid
    const assemblies = this.state.assemblies[this.state.idx];

    for (let i = 0; i < assemblies.length; i++) {
      if (assemblies[i].value.value === assembly) {
        this.state.cb(assembly);
      }
    }
  };

  render() {
    return (
      <Fragment>
        <h3>Choose a genome</h3>
        <span
          className="content"
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "row",
            marginLeft: 0
          }}
        >
          {/* <div className="select-wrapper"> */}
          <select defaultValue={this.state.species[this.state.idx]}>
            {this.state.species.map(specie => (
              <option key={specie} value={specie}>
                {specie}
              </option>
            ))}
          </select>
          {/* </div> */}
          {/* <div className="select-wrapper"> */}
          <select defaultValue="" onChange={this.handleSelected}>
            <option disabled value="">
              Assembly
            </option>
            {this.state.assemblies[this.state.idx].map((assembly, idx) => (
              <option key={idx} value={assembly.value.value}>
                {assembly.name}
              </option>
            ))}
          </select>
          {/* </div> */}
        </span>
      </Fragment>
    );
  }
}
export default GenomeSelector;

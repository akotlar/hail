package jobs

// TOOD: Decide whether to rely on "k8s.io/api/core/v1"
// or "golang.org/x/build/kubernetes/api"
// Both claim v1 compliance, client-go uses the latter

// TODO: Add caching layer

import (
	// "github.com/google/uuid"
	jsoniter "github.com/json-iterator/go"
	kubeApi "golang.org/x/build/kubernetes/api"

	"github.com/google/uuid"
)

var jsonFast = jsoniter.ConfigFastest
var instanceID = uuid.New().String()

// JobRequest defines the structure of the JSON string that is sent to batch server
// to generate a new batch job
type JobRequest struct {
	// TODO/FIXME: BatchID should no longer be used
	// We should rely on a MySQL id, or force a uuid v2 int, hope for no collisions
	// However, this would require a breaking change
	// With existing batch client / api
	BatchID int `json:"batch_id"`
	// TODO: Explain use cases
	Attributes map[string]string `json:"attributes"`
	// cd ..
	Callback string          `json:"callback"`
	Spec     kubeApi.PodSpec `json:"spec"`
}

// The resulting job
type Job struct {
	ID          int                 `json:"id"`
	BatchID     int                 `json:"batch_id"`
	Attributes  map[string]string   `json:"attributes"`
	Callback    string              `json:"callback"`
	PodTemplate kubeApi.PodTemplate `json:"pod_template"`
	// Currently not implemented
	ContainerState kubeApi.ContainerState `json:"container_state"`
	// One of Created/Complete/Cancelled
	State    string `json:"state"`
	ExitCode int    `json:"exit_code"`
}

// Create a common ID, Attributes map[string] for a number of jobs
// We handle this by creating a new entyr in the Batches MySQL table
// And
type Batch struct {
	Attributes map[string]string `json:"attributes"`
}

var status = map[string]string{
	"init": "Initialized",
	"created":   "Created",
	"complete":  "Complete",
	"cancelled": "Canelled",
}

// CreateBatch inserts a new entry in the jobs.batch table, and returns a JSON
// object with the inserted id, as well as the passed-in attributes
// func CreateBatch(attributes []byte) (Batch, err) {

// }

// Takes a json string, validates it to match Kubernetes V1 Api
func CreateJob(jsonStr []byte) (Job, error) {
	jobRequest, err := unmarshal(jsonStr)

	var j Job
	if err != nil {
		return j, err
	}

	if jobRequest == nil {

	}

	res := mysq_op

	podTemplate := kubeApi.ObjectMeta{
		GenerateName: fmt.Sprintf("job-%d", res.id),
		Labels= map[string]string{
			"app": "batch-job",
			"hail.is/batch-instance": instanceID,
			"uuid": uuid.New().Hex()
		}
	}

	j.ID  := Job{
		ID:             1,
		BatchID:        jobRequest.BatchID,
		Attributes:     jobRequest.Attributes,
		Callback:       jobRequest.Callback,
		PodTemplate:    jobRequest.PodTemplate,
		ContainerState: nil,
		State:          status["created"],
	}

	return j, err
}

func unmarshal(jsonStr []byte) (j *JobRequest, err error) {
	err = jsonFast.Unmarshal(jsonStr, &j)

	return j, err
}

func CreateBatch() {

}

// func NewBatch(

// 	func(jsonStr) byte) error {
// 	var j JobRequest

// 	var h codec.Handle = new(codec.JsonHandle)
// 	var dec *codec.Decoder = codec.NewDecoderBytes(jsonStr, h)
// 	var err error = dec.Decode(j)

// 	if err != nil {
// 		panic(err)
// 	}

// 	return err
// 	// fmt.Print(j)
// }

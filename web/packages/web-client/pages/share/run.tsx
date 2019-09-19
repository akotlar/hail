// import 'isomorphic-unfetch';

// if (typeof window !== undefined) {
//   fetch(`${url}/jobs/list/all/public`, {
//     credentials: "include"
//   })
//     .then(r => r.json())
//     .then(data => {
//       _public = data;
//       console.info("data", data);
//       callbacks.call("public", data);
//     })
//     .catch(e => {
//       console.info(e.message);
//       console.info("failed to fetch", e.message);
//     });
// }

export default () =>
  <div id='share'>
    <div id='run'>
    </div><div>Running</div>
  </div>


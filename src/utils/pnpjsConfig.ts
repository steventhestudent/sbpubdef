/* eslint-disable no-var */
import { WebPartContext } from "@microsoft/sp-webpart-base";

// import pnp and pnp logging system
import { ISPFXContext, spfi, SPFI, SPFx as spSPFx } from "@pnp/sp";
import { graphfi, GraphFI, SPFx as graphSPFx } from "@pnp/graph";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
// import "@pnp/sp/site-users/web";
// import "@pnp/sp/fields";
// import "@pnp/sp/files";
// import "@pnp/sp/folders";
// import "@pnp/sp/clientside-pages";
// import "@pnp/sp/search";

var _sp: SPFI;
var _graph: GraphFI;

export const getSP = (context?: WebPartContext): SPFI => {
	if (_sp === undefined || _sp === null) {
		//You must add the @pnp/logging package to include the PnPLogging behavior it is no longer a peer dependency
		// The LogLevel set's at what level a message will be written to the console
		_sp = spfi().using(spSPFx(context as ISPFXContext));
	}
	return _sp;
};
// export const getSP = (context: any) => spfi().using(SPFx(context));

export const getGraph = (context?: WebPartContext): GraphFI => {
	if (_graph === undefined || _graph === null) {
		//You must add the @pnp/logging package to include the PnPLogging behavior it is no longer a peer dependency
		// The LogLevel set's at what level a message will be written to the console
		_graph = graphfi().using(graphSPFx(context as ISPFXContext));
	}
	return _graph;
};

import * as d3 from "d3";
import { Selection, ZoomBehavior } from "d3";
import React, {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from "react";
import { IGraphConfig, IGraphProps } from "./Graph.types";
import { NodeMap } from "./NodeMap";
import { LinkMatrix } from "./LinkMatrix";
import { throttle } from "lodash";
import { mergeConfig } from "../../utils";
import { DEFAULT_CONFIG } from "./graph.config";
import { NodeModel } from "./NodeModel";
import { LinkModel } from "./LinkModel";
import { default as CONST } from "./graph.const"
import { LinkMap, IGraphNodeDatum } from './LinkMap';

const CLASS_NAME_ROOT_SVG: string = "fg-root-svg";

export function calcViewBox(
  width: number,
  height: number,
  x: number,
  y: number,
  zoom: number
): string {
  return `${-x / zoom},${-y / zoom},${width / zoom},${height / zoom}`;
}

export const Graph: FC<IGraphProps> = (props: IGraphProps) => {
  const nodeMapRef: MutableRefObject<NodeMap> = useRef(new NodeMap());
  const linkMapRef: MutableRefObject<LinkMap> = useRef(new LinkMap());
  const linkMatrixRef: MutableRefObject<LinkMatrix> = useRef(new LinkMatrix());
  const simulationRef: MutableRefObject<
    d3.Simulation<IGraphNodeDatum, undefined> | undefined
  > = useRef();
  const zoomRef: MutableRefObject<
    ZoomBehavior<Element, unknown> | undefined
  > = useRef();

  const graphId: string = props.id.replaceAll(/ /g, "_");
  const graphContainerId: string = `fg-container-${graphId}`;
  const graphConfig: IGraphConfig = useMemo(
    () => mergeConfig(DEFAULT_CONFIG, props.config),
    [props.config]
  );
  const { width, height } = graphConfig;

  // @ts-ignore: Unused locals
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ignored, forceUpdateDispatch] = useReducer(x => x + 1, 0);
  const forceUpdate = useCallback(throttle(forceUpdateDispatch, 50), []);

  const [viewBox, setViewBox] = useState(() => {
    return calcViewBox(graphConfig.width, graphConfig.height, 0, 0, 1);
  });
  const handleZoom = useCallback(
    throttle((x, y, k) => {
      setViewBox(calcViewBox(graphConfig.width, graphConfig.height, x, y, k));
    }, 50),
    []
  );

  useEffect(() => {
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation(
        nodeMap.getSimulationNodeDatums()
      );
      simulationRef.current
        .force("charge", d3.forceManyBody().strength(-150))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", forceUpdate);

      const forceLink = d3.forceLink(linkMap.getSimulationLinkDatums())
        .id(node => (node as IGraphNodeDatum).id)
        .distance(graphConfig.d3.linkLength)
        .strength(graphConfig.d3.linkStrength);

      simulationRef.current.force(CONST.LINK_CLASS_NAME, forceLink);
      // TODO stop simulation earlier?
    }
  });

  useEffect(() => {
    if (!zoomRef.current) {
      const zoomSelection: Selection<
        Element,
        unknown,
        Element,
        unknown
      > = d3.select(`#${graphContainerId}`);
      const zoomBehavior = d3.zoom();
      zoomRef.current = zoomBehavior;
      zoomSelection.call(zoomBehavior);
    }
    zoomRef.current.scaleExtent([graphConfig.minZoom, graphConfig.maxZoom]);
    zoomRef.current.on("zoom", event => {
      console.log(event);
      handleZoom(event.transform.x, event.transform.y, event.transform.k);
    });
  }, [graphContainerId, graphConfig.minZoom, graphConfig.maxZoom, handleZoom]);

  const onClickGraph = useCallback(
    event => {
      // TODO pause animation?
      if (
        (event.target as SVGSVGElement)?.classList.contains(CLASS_NAME_ROOT_SVG)
      ) {
        props.onClickGraph?.(event);
      }
    },
    [props.onClickGraph]
  );

  const rootId: string | undefined =
    props.nodes.length > 0 ? props.nodes[0].id : undefined;
  const nodeMap: NodeMap = nodeMapRef.current;
  const linkMap: LinkMap = linkMapRef.current;
  const linkMatrix: LinkMatrix = linkMatrixRef.current;

  nodeMap.updateNodeMap(props.nodes, props.nodeConfig || {});
  linkMap.updateLinkMap(props.links, nodeMap, props.linkConfig);
  linkMatrix.updateMatrix(props.links, props.linkConfig || {}, nodeMap);
  const elements = onRenderElements(rootId, nodeMap, linkMatrix);

  return (
    <div id={graphContainerId}>
      <svg
        width={width}
        height={height}
        className={CLASS_NAME_ROOT_SVG}
        viewBox={viewBox}
        onClick={onClickGraph}
      >
        <g>{elements}</g>
      </svg>
    </div>
  );
};

export function onRenderElements(
  rootId: string | undefined,
  nodeMap: NodeMap,
  linkMatrix: LinkMatrix
): JSX.Element {
  if (!rootId) {
    return <></>;
  }

  const elements: JSX.Element[] = [nodeMap.get(rootId).renderNode()];
  const queue: NodeModel[] = [nodeMap.get(rootId)];
  const rendered: Set<NodeModel | LinkModel> = new Set();
  while (queue.length > 0) {
    const current: NodeModel = queue.shift()!;
    linkMatrix.forEachWithSource(current.id, (link: LinkModel) => {
      if (!rendered.has(link)) {
        elements.push(link.renderLink());
        rendered.add(link);
      }
      if (!rendered.has(link.targetNode)) {
        elements.push(link.targetNode.renderNode());
        rendered.add(link.targetNode);
        queue.push(link.targetNode);
      }
    });
  }
  return <>{elements}</>;
}

import { createSelector } from 'reselect';
import { arrayToObject } from '../../utils';
import utils from '@quantumblack/kedro-ui/lib/utils';
import IndicatorIcon from '../icons/indicator';
import IndicatorOffIcon from '../icons/indicator-off';
import IndicatorPartialIcon from '../icons/indicator-partial';
import VisibleIcon from '../icons/visible';
import InvisibleIcon from '../icons/invisible';
const { escapeRegExp, getHighlightedText } = utils;

/**
 * Get a list of IDs of the visible nodes
 * @param {object} nodes Grouped nodes
 * @return {array} List of node IDs
 */
export const getNodeIDs = (nodes) => {
  const getNodeIDs = (type) => nodes[type].map((node) => node.id);
  const concatNodeIDs = (nodeIDs, type) => nodeIDs.concat(getNodeIDs(type));

  return Object.keys(nodes).reduce(concatNodeIDs, []);
};

/**
 * Compares items for sorting in groups first
 * by enabled status (by tag) and then alphabeticaly (by name)
 * @param {object} itemA First item to compare
 * @param {object} itemB Second item to compare
 * @return {number} Comparison result
 */
const compareEnabledThenAlpha = (itemA, itemB) => {
  const byEnabledTag = Number(itemA.disabled_tag) - Number(itemB.disabled_tag);
  const byAlpha = itemA.name.localeCompare(itemB.name);
  return byEnabledTag !== 0 ? byEnabledTag : byAlpha;
};

/**
 * Add a new highlightedLabel field to each of the node objects
 * @param {object} nodes Grouped lists of nodes
 * @param {string} searchValue Search term
 * @return {object} The grouped nodes with highlightedLabel fields added
 */
export const highlightMatch = (nodes, searchValue) => {
  const addHighlightedLabel = (node) => ({
    highlightedLabel: getHighlightedText(node.name, searchValue),
    ...node,
  });
  const addLabelsToNodes = (newNodes, type) => ({
    ...newNodes,
    [type]: nodes[type].map(addHighlightedLabel),
  });

  return Object.keys(nodes).reduce(addLabelsToNodes, {});
};

/**
 * Check whether a name matches the search text
 * @param {string} name
 * @param {string} searchValue
 * @return {boolean} True if match
 */
export const nodeMatchesSearch = (node, searchValue) => {
  const valueRegex = searchValue
    ? new RegExp(escapeRegExp(searchValue), 'gi')
    : '';
  return Boolean(node.name.match(valueRegex));
};

/**
 * Return only the results that match the search text
 * @param {object} nodes Grouped lists of nodes
 * @param {string} searchValue Search term
 * @return {object} Grouped nodes
 */
export const filterNodes = (nodes, searchValue) => {
  const filterNodesByType = (type) =>
    nodes[type].filter((node) => nodeMatchesSearch(node, searchValue));
  const filterNodeLists = (newNodes, type) => ({
    ...newNodes,
    [type]: filterNodesByType(type),
  });
  return Object.keys(nodes).reduce(filterNodeLists, {});
};

/**
 * Return filtered/highlighted nodes, and filtered node IDs
 * @param {object} nodes Grouped lists of nodes
 * @param {string} searchValue Search term
 * @return {object} Grouped nodes, and node IDs
 */
export const getFilteredNodes = createSelector(
  [(state) => state.nodes, (state) => state.searchValue],
  (nodes, searchValue) => {
    console.log('state.nodes', nodes);
    const filteredNodes = nodes ? filterNodes(nodes, searchValue) : {};

    return {
      filteredNodes: highlightMatch(filteredNodes, searchValue),
      nodeIDs: getNodeIDs(filteredNodes),
    };
  }
);

/**
 * Compares items for sorting in groups first
 * by enabled status (by tag) and then alphabeticaly (by name)
 * @param {object} itemA First item to compare
 * @param {object} itemB Second item to compare
 * @return {number} Comparison result
 */
export const getFilteredNodeItems = createSelector(
  [getFilteredNodes, (state) => state.nodeSelected],
  ({ filteredNodes }, nodeSelected) => {
    const result = {};

    for (const type of Object.keys(filteredNodes)) {
      result[type] = filteredNodes[type]
        .map((node) => {
          const checked = !node.disabled_node;
          const disabled =
            node.disabled_tag ||
            node.disabled_type ||
            node.disabled_modularPipeline;
          return {
            ...node,
            visibleIcon: VisibleIcon,
            invisibleIcon: InvisibleIcon,
            active: undefined,
            selected: nodeSelected[node.id],
            faded: node.disabled_node || disabled,
            visible: !disabled && checked,
            unset: false,
            checked,
            disabled,
          };
        })
        .sort(compareEnabledThenAlpha);
    }

    return result;
  }
);

/**
 * Return filtered/highlighted modular pipelines
 * @param {object} modularPipelines List of modular pipelines
 * @param {string} searchValue Search term
 * @return {object} Grouped modular pipelines
 */
export const getFilteredModularPipelines = createSelector(
  [(state) => state.modularPipelines, (state) => state.searchValue],
  (modularPipelines, searchValue) =>
    highlightMatch(
      filterNodes({ modularPipeline: modularPipelines }, searchValue),
      searchValue
    )
);

/**
 * Return filtered/highlighted modular pipeline list items
 * @param {object} filteredModularPipelines List of filtered modularPipelines
 * @return {array} Node list items
 */
export const getFilteredModularPipelineItems = createSelector(
  getFilteredModularPipelines,
  (filteredModularPipelines) => ({
    modularPipeline: filteredModularPipelines.modularPipeline.map(
      (modularPipeline) => ({
        ...modularPipeline,
        type: 'modularPipeline',
        visibleIcon: IndicatorIcon,
        invisibleIcon: IndicatorOffIcon,
        active: false,
        selected: false,
        faded: false,
        visible: true,
        disabled: false,
        unset: !modularPipeline.enabled,
        checked: modularPipeline.enabled,
      })
    ),
  })
);

/**
 * Returns filtered/highlighted items for nodes, tags and modular pipelines
 * @param {object} filteredNodeItems List of filtered nodes
 * @param {object} filteredTagItems List of filtered tags
 * @param {object} filteredModularPipelinesItems List of filtered modularPipelines
 * @return {array} final list of all filtered items from the three filtered item sets
 */
export const getFilteredTreeItems = createSelector(
  [getFilteredNodeItems, getFilteredModularPipelineItems],
  (filteredNodeItems, filteredModularPipelineItems) => {
    return {
      ...filteredNodeItems,
      ...filteredModularPipelineItems,
    };
  }
);

// new filter logic:
// 1. filter the set of nodes by search value
// 2. filter the set of modular pipelines by search value
// 3. go through the set of filtered nodes to append the modular pipeline to the lsit of modular pipelines

/**
 * returns an array of the corresponding filtered nodes
 * filtered nodes for each modular pipeline
 */
export const getFilteredModularPipelineNodes = createSelector(
  [
    getFilteredNodeItems,
    getFilteredModularPipelineItems,
    (state) => state.modularPipelineIds,
  ],
  (filteredNodeItems, filteredModularPipelines, modularPipelineIDs) => {
    const modularPipelineNodes = arrayToObject(modularPipelineIDs, () => []);
    const { modularPipeline } = filteredModularPipelines;

    // create a new field for the topmost / root pipeline
    modularPipelineNodes['main'] = [];

    // go through each type of nodes first to identify root level nodes
    Object.keys(filteredNodeItems).forEach((key) => {
      filteredNodeItems[key].map((node, i) => {
        // console.log(`${key} nodes`, node);
        if (node.modularPipelines.length === 0) {
          modularPipelineNodes.main.push(node);
          filteredNodeItems[key].splice(i, 1);
        }
      });
    });

    // go through the set of nodes and slot them into the corresponding modular pipeline array
    modularPipeline.map((mp) => {
      Object.keys(filteredNodeItems).forEach((key) =>
        filteredNodeItems[key].map((nodeItem) => {
          if (nodeItem.modularPipelines.includes(mp.id)) {
            modularPipelineNodes[mp.id].push(nodeItem);
          }
        })
      );
    });

    return modularPipelineNodes;
  }
);

/**
 * returns an array of modular pipelines arranged in a nested structure with corresponding nodes and names
 */
export const getNestedModularPipelines = createSelector(
  [getFilteredModularPipelines, getFilteredModularPipelineNodes],
  (modularPipelineItems, modularPipelineNodes) => {
    console.log('filteredModularPipelineNodes', modularPipelineNodes);
    console.log('filteredModularPipelineItems', modularPipelineItems);

    modularPipelineItems = modularPipelineItems.modularPipeline;
    // go through modular pipeline ids to return nested data structure
    const mainTree = {
      nodes: modularPipelineNodes ? modularPipelineNodes.main : [],
      children: [],
      name: 'main',
      id: 'main',
      enabled: true,
      type: 'modularpipeline',
    };
    let level = 1; // this keeps track of how far you are down in the nested pipeline
    let currentParent = mainTree;

    // ** note to self: current set up only works with the assumption that the parent modular pipeline exists
    modularPipelineItems.forEach((modularPipeline) => {
      const { id } = modularPipeline;
      let currentLevel = id.split('.').length;

      // determine the current parent and update level
      if (currentLevel > level) {
        // look for the parent modular pipeline in the new lower level
        let i = id.lastIndexOf('.');
        const parent = id.substr(0, i);
        // update the current parent to a new lower level
        currentParent = currentParent.children.filter(
          (mp) => mp.id === parent
        )[0];
        level = currentLevel;
      } else if (currentLevel === 1) {
        // update the current parent back to the top parent
        level = 1;
        currentParent = mainTree;
      }

      console.log('currentParent', currentParent);
      // add in the new level and nodes
      currentParent.children.push(
        Object.assign(modularPipeline, {
          children: [],
          nodes: modularPipelineNodes[id],
        })
      );
      //update current level
      level = currentLevel;
    });

    return mainTree;
  }
);

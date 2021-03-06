// Function to 'load JSON' Love Diagram data

function loadContent(relevantObjectTypes, relevantObjectTypesDic, enableD3JS) {
  $.getJSON("./temp/cw_evolve_Assess_Customer_Accounts_diagram.json", function(data) {

    // $.getJSON( "./temp/cw_diagram_evolve_basic_steps.json", function( data ) {
    // $.getJSON( "./temp/cw_evolve_diagram.json", function( data ) {
    // $.getJSON( "./temp/cw_diagram_evolve_product_installation.json", function( data ) {

    var relevantShapes = getRelevantShapes(relevantObjectTypesDic, data.result.diagram.shapes);
    var joiners = getRelevantJoiners(relevantShapes, data.result.diagram.joiners, enableD3JS);
    var exportJson = generateInstructionSheet(relevantObjectTypes, relevantObjectTypesDic, {
      'name': data.result.name,
      'description': 'This is the description of this process from Evolve to be used Live in the field thanks to Casewise Tactac.'
    }, data.result.diagram.shapes, false);

    $("<h4>Loading diagram \"" + data.result.name + "\":</h4>").appendTo("#evo");
    $("<img src='./temp/cw_evolve_Assess_Customer_Accounts_diagram.png' width='90%'></img>").appendTo("#evo");

    $("<h4>Loading config file for mapping:</h4>").appendTo("#evo");
    $("<div class='codeBloc'><pre><code>" + JSON.stringify(relevantObjectTypesDic) + "</code></pre></div>").appendTo("#evo");

    $("<h4>Relevant objects parsed from the diagram:</h4>").appendTo("#evo");
    var processHtml = drawProcessSequenceHtml(relevantShapes, joiners);
    $(processHtml).appendTo("#evo");

    $("<div class='codeBloc'><pre><code>" + JSON.stringify(exportJson) + "</code></pre></div>").appendTo("#formated2");
    $("#downloadLink").html(downloadJSON(exportJson));
    // $("<div class='codeBloc'><pre><code>" + JSON.stringify(exportJson, null, 1) + "</code></pre></div>").appendTo("#formated2");

    $("#tac2").html(json2HtmlTable(exportJson));
  });
}

/*
 * Parse shapes
 */
function getRelevantShapes(relevantObjectTypesDic, shapes) {
  var relevantShapes = [];
  // LATER: to build an external config file with the required consitency rules

  // recognising the Object type of the palette entries:
  $.each(shapes, function(key, shape) {
    var posInRelevantDic = relevantObjectTypesDic[shape['cwObject']['objectTypeScriptName']]; // is undefined if not in the Dic

    if (posInRelevantDic !== undefined) {
      //add each relevant one to the global list
      relevantShapes.push(shape);
    }
  });
  return relevantShapes;
}

/*
 * function generate an Instruction Sheet in JSON for import in the cloud API
 */
function generateInstructionSheet(relevantObjectTypes, relevantObjectTypesDic, instructionSheet, shapes, enableLog) {

  var rule = [],
    relevantShapes = [],
    pages = [],
    groups = [],
    steps = [],
    nbStep = 0,
    nbRole = 0,
    nbEvent = 0,
    nbResult = 0,
    nbObjectInError = 0,
    instructionSheetJSON,
    posInRelevantDic,
    ot,
    evtrsltType,
    oName,
    oDesc,
    oSeq;

  ///////////////////////////////////////
  shapes.forEach(function(shape) {
    posInRelevantDic = relevantObjectTypesDic[shape['cwObject']['objectTypeScriptName']]; // is undefined if not in the Dic
    ot = shape['cwObject']['objectTypeScriptName'];
    oName = shape['cwObject']['properties']['name'];
    oDesc = shape.cwObject.properties.description;
    oSeq = shape.Sequence;

    switch (posInRelevantDic.TactacObject) {
      case 'step':
        // console.info(shape['cwObject']['objectTypeScriptName'] + ': ' + oName + ' >> This object has been used to create a step');
        // var nextSteps = getNextStep(relevantObjectTypes, joiners, 3)

        steps.push(createStep({
            'name': oName,
            'description': oDesc,
            'position': oSeq
          },
          null // stepAnswers
          // INPUT: oSeq
          // {'AnswerText': 'text', 'AnswerSetID': answerSetID, 'AnswerID': answerId++, 'TempTargetStepID': targetSeq}
        ));
        nbStep++;
        break;
      case 'eventresult':
        evtrsltType = shape['paletteEntryKey'].split("|")[1];
        switch (evtrsltType) {
          case '4':
          case '1':
            // console.warn('Result: ' + oName + ' >> This object has been ignored');
            nbResult++;
            break;
          case '0':
          case '2':
            // console.warn('Event: ' + oName + ' >> This object has been ignored');
            nbEvent++;
            break;
          default:
            // console.error(shape['cwObject']['objectTypeScriptName'] + ': ' + oName + ' of type:' + evtrsltType + ' >> This object has not been selected, check your config file');
        }
        break;
      case 'role':
        // console.info(shape['cwObject']['objectTypeScriptName'] + ': ' + oName + ' >> This object has been considered has the main role');
        nbRole++;
        break;
      case 'connectorset':
        // console.warn(shape['cwObject']['properties']['type'] + ': ' + oName + ' >> This object has been ignored');
        break;
      default:
        nbObjectInError++;
        // console.error(shape['cwObject']['objectTypeScriptName'] + ': ' + oName + ' >> This object has not been selected, check your config file');
    }
  });

  groups.push(createGroup({
    'name': 'Group 1',
    'description': 'Group description'
  }, steps));

  pages.push(createPage({
    'name': 'Page 1',
    'description': 'Page description'
  }, groups));

  instructionSheetJSON = createInstructionSheet({
    'name': instructionSheet.name,
    'description': instructionSheet.description
  }, pages, null);

  return instructionSheetJSON;
}


/* Get parents and children
 * ********** NOT YET FINISHED ??
 * need to decide to use Key or Seq as an ID ... ?
 */
function getParentsAndChildrenFromListOfJoiners( joiners) {
      // 'sourceKey': sourceKey,
      // 'targetKey': targetKey,
      // 'FromSeq': sourceSeq,
      // 'ToSeq': targetSeq
  var parents = []
    ,children = []
    ,rootNodes = []
    ,posParents
    ,posChildren
    ,HasGrandParent;
    console.debug('getParentsAndChildrenFromListOfJoiners: ' + JSON.stringify(joiners));
    joiners.forEach(function(joiner) {
    // PARENTS
    posParents = arrayObjectIndexOf(parents, joiner.sourceKey, "father");
    if (posParents < 0) {
      parents.push({'father': joiner.sourceKey, 'children': joiner.targetKey});
    }
    else {
      parents[posParents].children = parents[posParents].children + ',' + joiner.targetKey;
    }

    // CHILDREN
    posChildren = arrayObjectIndexOf(children, joiner.targetKey, "boy");
    if (posChildren < 0) {
      children.push({'boy': joiner.targetKey, 'parents': joiner.sourceKey});
    }
    else {
      children[posChildren].parents = children[posChildren].parents + ',' + joiner.sourceKey;
    }
  });
  return {'parents': parents, 'children': children};
}


/*
 * Parse and get only the joiners
 */
function getRootNodesOfGraphFromListOfJoiners(joiners) {
  // parcorus tous les seq
  // list seq enfant et seq parent
  // ensuite pr chacun tu regardes qui a des parents et qui a des enfants
  // attention au doublons d enfant

      // 'sourceKey': sourceKey,
      // 'targetKey': targetKey,
      // 'FromSeq': sourceSeq,
      // 'ToSeq': targetSeq
  var parents = []
    ,children = []
    ,rootNodes = []
    ,posParents
    ,posChildren
    ,HasGrandParent
  ;

  joiners.forEach(function(joiner) {
    // PARENTS
    posParents = arrayObjectIndexOf(parents, joiner.sourceKey, "father");
    if (posParents < 0) {
      parents.push({'father': joiner.sourceKey, 'children': joiner.targetKey});
    }
    else {
      parents[posParents].children = parents[posParents].children + ',' + joiner.targetKey;
    }

    // CHILDREN
    posChildren = arrayObjectIndexOf(children, joiner.targetKey, "boy");
    if (posChildren < 0) {
      children.push({'boy': joiner.targetKey, 'parents': joiner.sourceKey});
    }
    else {
      children[posChildren].parents = children[posChildren].parents + ',' + joiner.sourceKey;
    }
  });

  parents.forEach(function(parent) {
    posParent = arrayObjectIndexOf(children, parent.father, "boy");
    if (posParent < 0) {
      HasGrandParent = false;
      // console.log(parent.father + ' Has NO Parent');
      rootNodes.push(parent.father);
    }
    else {
      HasGrandParent = true;
      // console.log(parent.father + ' Has Parent');
    }
  });

  // console.log(parents);
  // console.log(children);
  return(rootNodes);
}



// Get next step when a step is followed by a XOR return a list
//  pour o on regarde ses enfants si les enfants de o sont des steps on les renvoient, si il s'agit de xor on recupere les enfants des xor et on les renvoient en plus
function getNextStep(relevantShapes, joiners, oSeq) {
  var genealogyTree = getParentsAndChildrenFromListOfJoiners(joiners);
  var nextSteps = {};

  // console.debug('Look for children of: ' + oSeq);
  joiners.forEach( function( joiner) {
    if(joiner.sourceKey == oSeq) {
      trgObj = relevantShapes[joiner.targetKey];
      trgOT = trgObj.cwObject.objectTypeScriptName;
      switch (trgOT) {
        case 'process':
          // console.debug(' child: step: ' + joiner.targetKey);
          if (nextSteps.shapes === undefined) {
            nextSteps = {'shapes': joiner.targetKey};
          }
          else {
            nextSteps.shapes = nextSteps.shapes + ',' + joiner.targetKey;
          }
          break;
        case 'connectorset':
          // console.debug(' child: connectorset: ' + joiner.targetKey);
          genealogyTree.parents.forEach( function( shape) {
            // console.debug('  checking genea: ' + shape.father +" ("+ shape.children +") == "+ joiner.targetKey);
            if (shape.father ==  joiner.targetKey) {
              if (nextSteps.shapes === undefined) {
                nextSteps = {'shapes': shape.children};
              }
              else {
                nextSteps.shapes = nextSteps.shapes + ',' + shape.children;
              }
            }
          });
          break;
        default:
          console.error(' default');
      }
    }
  });
  return nextSteps;
}

////////////////////////////////////////
function containsObject(obj, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i] === obj) {
      return true;
    }
  }
  return false;
} //////////////////////////////////////


function getChild(genealogyList, ofather) {
  genealogyList.parents.forEach( function( object) {
    if (object.father ==  ofather) {
      var child = JSON.parse(object.children);
      // console.log(ofather + ' getChild: ' + JSON.stringify(child) + ', ' + JSON.stringify(genealogyList));
      return child;
    }
  });
}

function buildTree(genealogyList, currentObject, tree) {
  var child;
  genealogyList.parents.forEach(function(object) {
    if (object.father == currentObject) {
      child = object.children;
      // if (typeof child === 'number') {
      //   // console.log('typeof child: ' + typeof child);
      // }
      //
      if (typeof child === 'string') {
        child = child.split(',');
      }
    }
  });
  console.log(currentObject + ', child: ' + child + ', ' + JSON.stringify(tree));

  if (child != undefined) {
    if (typeof child === 'number') {
      tree.shape = buildTree(genealogyList, child, tree);
      //return child;
    } else {
      child.forEach(function(shape) {
        tree.shape = buildTree(genealogyList, shape, tree);
      });
    }
  } else {
    tree.shape = currentObject;
    tree.next = child;
    //console.log('typeof child: ' + typeof child);
    return tree;
  }
}

var countdown = function(value) {
    if (value > 0) {
        console.log(value);
        return countdown(value - 1);
    } else {
        return value;
    }
};
// countdown(10);

/*
 * Important function in charge of ready th ediagram content and drawing the graph
 * including D3JS required stuff to build a directgraph
 */
function getRelevantJoiners(relevantShapes, joiners, enableGraph) {
  var myList = [],
    links = [],
    nodes = [],
    i = 0;

  joiners.forEach(function(joiner) {
    var sourceSeq = joiner['FromSeq'],
      targetSeq = joiner['ToSeq'],
      sourceCondition = '',
      targetCondition = '',
      sourceKey = arrayObjectIndexOf(relevantShapes, sourceSeq, "Sequence"),
      targetKey = arrayObjectIndexOf(relevantShapes, targetSeq, "Sequence"),
      srcObj = relevantShapes[sourceKey],
      trgObj = relevantShapes[targetKey];

    myList.push({
      'sourceKey': sourceKey,
      'targetKey': targetKey,
      'FromSeq': sourceSeq,
      'ToSeq': targetSeq
    });

    if (srcObj.cwObject.objectTypeScriptName == 'connectorset') {

      var previous = links[links.length - 1];
      // WARNING NOT GOOD AT ALL (managing the XOR)
      // links.pop();
      if (arrayObjectIndexOf(nodes, targetKey, "id") < 0) {
        nodes.push({
          'id': targetKey,
          'name': trgObj.cwObject.properties.name,
          'reflexive': false
        });
        i++;
      }

      links.push({
        'source': previous.source,
        'target': nodes[arrayObjectIndexOf(nodes, targetKey, "id")],
        'left': false,
        'right': true
      });
      return true; // it is a connector we skip it to reach targets directly

    } else {
      if (arrayObjectIndexOf(nodes, sourceKey, "id") < 0) {
        nodes.push({
          'id': sourceKey,
          'name': srcObj.cwObject.properties.name,
          'reflexive': false
        });
        i++;
      }
    }

    if (arrayObjectIndexOf(nodes, targetKey, "id") < 0) {
      nodes.push({
        'id': targetKey,
        'name': trgObj.cwObject.properties.name,
        'reflexive': false
      });
      i++;
    }

    links.push({
      'source': nodes[arrayObjectIndexOf(nodes, sourceKey, "id")],
      'target': nodes[arrayObjectIndexOf(nodes, targetKey, "id")],
      'left': false,
      'right': true
    });
    // console.log(sourceKey + ' > ' + targetKey);
  });
  // console.log(JSON.stringify(myList, null, 1));
  // console.log(JSON.stringify(nodes, null, 1));
  // console.log(JSON.stringify(links, null, 1));

  if(enableGraph) {drawGraphD3JS(nodes, links);}

  myList.sort(function(a, b) {
      return b.targetKey - a.targetKey;
  })

  return myList;
}

// Check some consistency rules on exiting shapes of the diagram
//  could be loaded from the same config file, next to the mapping of objects
function checkConsistencyRulesOnShapes(shapes) {
  //TBD
}

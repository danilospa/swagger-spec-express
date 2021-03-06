'use strict';
var os = require('os');
var _ = require('lodash');
var util = require('util');
let indentation = ' * ';

/** Generates a JsDoc comment based on the provided schema
 * @param {string} paramName the name of the parameter that the schema applies to
 * @param {object} schema The json schema to use to generate the comment
 * @param {string} eol The end of line string to use, defaults to os.EOL .
 * @return {string} The generated comment
 */
module.exports = function generateJsDocCommentFromSchema(paramName, schema, eol) {
    let comment = '';
    eol = eol || os.EOL;
    let description = '@param {object} ' + paramName + ' ';
    if (schema.description) {
        comment += addComment(description + schema.description, eol);
    } else {
        comment += addComment(description + 'todo', eol);
    }
    comment += generateJsDocCommentForProperties(schema.properties, paramName + '.', schema.required, eol, 0);
    comment = ' ' + comment.trim();
    return comment;
};

function addComment(message, eol, indentLevel) {
    if (!message) {
        throw new Error("Message cannot be blank");
    }
    var prefix = '';
    if (_.isNil(indentLevel)) {
        indentLevel = 1;
    }
    for (var i = 0; i < indentLevel; i++) {
        prefix += indentation;
    }
    return prefix + message + eol;
}


function generateJsDocCommentForProperties(properties, prefix, requiredFields, eol, loopCounter) {
    loopCounter++;
    if (loopCounter > 20) {
        throw new Error(util.format("Too many loops, probably a circular schema %s", prefix));
    }
    let comment = '';
    prefix = prefix || '';
    requiredFields = requiredFields || [];
    Object.keys(properties).forEach(function (key) {

        comment += generateJsDocCommentForProperty(key, properties[key], requiredFields, prefix, eol, loopCounter);
    });
    return comment;
}

const dontDigInto = ['header.items', 'path.items', 'query.items', 'formData.items', 'responseHeader.items', 'body.schema'];
function generateJsDocCommentForProperty(propertyName, property, requiredFields, prefix, eol, loopCounter) {
    let comment = '';
    var description = property.description || 'todo-description';
    if (!property.type) {
        if (Object.keys(property).length === 0 || propertyName === 'default') {
            return '';
        }
        if (property.allOf) {
            property = _.merge.apply(null, [{}].concat(property.allOf));
        }
        if (property.anyOf) {
            property.type = property.anyOf.map(function (item) {
                return item.type;
            });
        }
        if (property.oneOf) {
            property.type = property.oneOf.map(function (item) {
                return item.type;
            });
        }
        if (!property.type) {
            throw new Error(util.format("Todo : %j", property, propertyName, prefix));
        }
    }
    var type = property.type;
    if (type === 'array') {
        if (!property.items) {
            type = 'Array.';
        }
        else if (!property.items.type) {
            if (propertyName === 'parameters') {
                type = ['object', 'string'];
            } else {
                throw new Error("todo");
            }
        } else {
            type = property.items.type + '[]';
        }
    }
    if (_.isArray(type)) {
        type = _.uniq(type).map(mapType).join('|');
    } else {
        type = mapType(type);
    }
    var optional = false;
    if (requiredFields.indexOf(propertyName) < 0) {
        optional = true;
    }
    var name = prefix + propertyName;
    var nameToPrint;
    if (optional) {
        nameToPrint = '[' + name + ']';
    } else {
        nameToPrint = name;
    }
    comment += addComment(util.format('@param {%s} %s - %s', type, nameToPrint, description), eol);
    if (property.properties) {
        if (dontDigInto.indexOf(prefix + propertyName) < 0) {
            let newPrefix = name + '.';
            comment += generateJsDocCommentForProperties(property.properties, newPrefix, property.required, eol, loopCounter);
        }
    }
    return comment;
}

function mapType(type) {
    if (type === 'integer') {
        return 'number';
    }
    return type;
}

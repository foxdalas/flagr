// Code generated by go-swagger; DO NOT EDIT.

package restapi

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"encoding/json"
)

// SwaggerJSON embedded version of the swagger document used at generation time
var SwaggerJSON json.RawMessage

func init() {
	SwaggerJSON = json.RawMessage([]byte(`{
  "consumes": [
    "application/json"
  ],
  "produces": [
    "application/json"
  ],
  "schemes": [
    "http"
  ],
  "swagger": "2.0",
  "info": {
    "description": "Flagr is a feature flagging, A/B testing and dynamic configuration microservice",
    "title": "Flagr",
    "version": "1.0.0"
  },
  "basePath": "/api",
  "paths": {
    "/evaluation": {
      "post": {
        "tags": [
          "evaluation"
        ],
        "operationId": "postEvaluation",
        "parameters": [
          {
            "description": "evalution context",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/evalContext"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "evaluation result",
            "schema": {
              "$ref": "#/definitions/evalResult"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags": {
      "get": {
        "tags": [
          "flag"
        ],
        "operationId": "findFlags",
        "responses": {
          "200": {
            "description": "list all the flags",
            "schema": {
              "$ref": "#/definitions/findFlagsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "post": {
        "tags": [
          "flag"
        ],
        "operationId": "createFlag",
        "parameters": [
          {
            "description": "create a flag",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/createFlagRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "returns the created flag",
            "schema": {
              "$ref": "#/definitions/flag"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags/{flagID}": {
      "get": {
        "tags": [
          "flag"
        ],
        "operationId": "getFlag",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag to get",
            "name": "flagID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "returns the flag",
            "schema": {
              "$ref": "#/definitions/flag"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "put": {
        "tags": [
          "flag"
        ],
        "operationId": "putFlag",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag to get",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "description": "update a flag",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/putFlagRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "returns the flag",
            "schema": {
              "$ref": "#/definitions/flag"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "delete": {
        "tags": [
          "flag"
        ],
        "operationId": "deleteFlag",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "OK deleted"
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags/{flagID}/segments": {
      "get": {
        "tags": [
          "segment"
        ],
        "operationId": "findSegments",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag to get",
            "name": "flagID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "segments ordered by rank of the flag",
            "schema": {
              "$ref": "#/definitions/findSegmentsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "post": {
        "tags": [
          "segment"
        ],
        "operationId": "createSegment",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag to get",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "description": "create a segment under a flag",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/createSegmentRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "segments ordered by rank of the flag",
            "schema": {
              "$ref": "#/definitions/segment"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags/{flagID}/segments/{segmentID}/constraints": {
      "get": {
        "tags": [
          "constraint"
        ],
        "operationId": "findConstraints",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the segment",
            "name": "segmentID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "constraints under the segment",
            "schema": {
              "$ref": "#/definitions/findConstraintsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "post": {
        "tags": [
          "constraint"
        ],
        "operationId": "createConstraint",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the segment",
            "name": "segmentID",
            "in": "path",
            "required": true
          },
          {
            "description": "create a constraint",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/createConstraintRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "the constraint created",
            "schema": {
              "$ref": "#/definitions/constraint"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags/{flagID}/segments/{segmentID}/distributions": {
      "get": {
        "tags": [
          "distribution"
        ],
        "operationId": "findDistributions",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the segment",
            "name": "segmentID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "distribution under the segment",
            "schema": {
              "$ref": "#/definitions/findDistributionsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "put": {
        "description": "replace the distribution with the new setting",
        "tags": [
          "distribution"
        ],
        "operationId": "putDistributions",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the segment",
            "name": "segmentID",
            "in": "path",
            "required": true
          },
          {
            "description": "array of distributions",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/putDistributionsRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "distribution under the segment",
            "schema": {
              "$ref": "#/definitions/putDistributionsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    },
    "/flags/{flagID}/variants": {
      "get": {
        "tags": [
          "variant"
        ],
        "operationId": "findVariants",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "variant ordered by variantID",
            "schema": {
              "$ref": "#/definitions/findVariantsOKBody"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      },
      "post": {
        "tags": [
          "variant"
        ],
        "operationId": "createVariant",
        "parameters": [
          {
            "minimum": 1,
            "type": "integer",
            "format": "int64",
            "description": "numeric ID of the flag",
            "name": "flagID",
            "in": "path",
            "required": true
          },
          {
            "description": "create a variant",
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/createVariantRequest"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "variant just created",
            "schema": {
              "$ref": "#/definitions/variant"
            }
          },
          "default": {
            "description": "generic error response",
            "schema": {
              "$ref": "#/definitions/error"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "constraint": {
      "type": "object",
      "required": [
        "property",
        "operator",
        "value"
      ],
      "properties": {
        "id": {
          "type": "integer",
          "format": "int64",
          "minimum": 1,
          "readOnly": true
        },
        "operator": {
          "type": "string",
          "minLength": 1,
          "enum": [
            "EQ",
            "NEQ",
            "LT",
            "LTE",
            "GT",
            "GTE",
            "EREG",
            "NEREG",
            "IN",
            "NOTIN",
            "CONTAINS",
            "NOTCONTAINS"
          ]
        },
        "property": {
          "type": "string",
          "minLength": 1
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "createConstraintRequest": {
      "type": "object",
      "required": [
        "property",
        "operator",
        "value"
      ],
      "properties": {
        "operator": {
          "type": "string",
          "minLength": 1
        },
        "property": {
          "type": "string",
          "minLength": 1
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "createFlagRequest": {
      "type": "object",
      "required": [
        "description"
      ],
      "properties": {
        "description": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "createSegmentRequest": {
      "type": "object",
      "required": [
        "description",
        "rolloutPercent"
      ],
      "properties": {
        "description": {
          "type": "string",
          "minLength": 1
        },
        "rolloutPercent": {
          "type": "integer",
          "format": "int64",
          "maximum": 100,
          "minimum": 0
        }
      }
    },
    "createVariantRequest": {
      "type": "object",
      "required": [
        "key"
      ],
      "properties": {
        "attachment": {
          "type": "object"
        },
        "key": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "distribution": {
      "type": "object",
      "required": [
        "percent",
        "variantID",
        "variantKey"
      ],
      "properties": {
        "bitmap": {
          "type": "string",
          "minLength": 1
        },
        "id": {
          "type": "integer",
          "format": "int64",
          "minimum": 1,
          "readOnly": true
        },
        "percent": {
          "type": "integer",
          "format": "int64",
          "maximum": 100,
          "minimum": 0
        },
        "variantID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        },
        "variantKey": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "error": {
      "type": "object",
      "required": [
        "message"
      ],
      "properties": {
        "message": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "evalContext": {
      "type": "object",
      "required": [
        "entityID",
        "entityType",
        "flagID"
      ],
      "properties": {
        "enableDebug": {
          "type": "boolean"
        },
        "entityContext": {
          "type": "object"
        },
        "entityID": {
          "type": "string",
          "minLength": 1
        },
        "entityType": {
          "type": "string",
          "minLength": 1
        },
        "flagID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        }
      }
    },
    "evalDebugLog": {
      "type": "object",
      "properties": {
        "msg": {
          "type": "string"
        },
        "segmentDebugLogs": {
          "$ref": "#/definitions/evalDebugLogSegmentDebugLogs"
        }
      }
    },
    "evalDebugLogSegmentDebugLogs": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/segmentDebugLog"
      },
      "x-go-gen-location": "models"
    },
    "evalResult": {
      "type": "object",
      "required": [
        "flagID",
        "segmentID",
        "variantID",
        "evalContext",
        "timestamp"
      ],
      "properties": {
        "evalContext": {
          "$ref": "#/definitions/evalContext"
        },
        "evalDebugLog": {
          "$ref": "#/definitions/evalDebugLog"
        },
        "flagID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        },
        "segmentID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        },
        "timestamp": {
          "type": "string",
          "minLength": 1
        },
        "variantAttachment": {
          "type": "object"
        },
        "variantID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        }
      }
    },
    "findConstraintsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/constraint"
      },
      "x-go-gen-location": "operations"
    },
    "findDistributionsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/distribution"
      },
      "x-go-gen-location": "operations"
    },
    "findFlagsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/flag"
      },
      "x-go-gen-location": "operations"
    },
    "findSegmentsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/segment"
      },
      "x-go-gen-location": "operations"
    },
    "findVariantsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/variant"
      },
      "x-go-gen-location": "operations"
    },
    "flag": {
      "type": "object",
      "required": [
        "description"
      ],
      "properties": {
        "description": {
          "type": "string",
          "minLength": 1
        },
        "id": {
          "type": "integer",
          "format": "int64",
          "minimum": 1,
          "readOnly": true
        },
        "segments": {
          "$ref": "#/definitions/flagSegments"
        },
        "variants": {
          "$ref": "#/definitions/flagVariants"
        }
      }
    },
    "flagSegments": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/segment"
      },
      "x-go-gen-location": "models"
    },
    "flagVariants": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/variant"
      },
      "x-go-gen-location": "models"
    },
    "putDistributionsOKBody": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/distribution"
      },
      "x-go-gen-location": "operations"
    },
    "putDistributionsRequest": {
      "type": "object",
      "required": [
        "distributions"
      ],
      "properties": {
        "distributions": {
          "$ref": "#/definitions/putDistributionsRequestDistributions"
        }
      }
    },
    "putDistributionsRequestDistributions": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/distribution"
      },
      "x-go-gen-location": "models"
    },
    "putFlagRequest": {
      "type": "object",
      "required": [
        "description"
      ],
      "properties": {
        "description": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "segment": {
      "type": "object",
      "required": [
        "description",
        "rank",
        "rolloutPercent"
      ],
      "properties": {
        "constraints": {
          "$ref": "#/definitions/segmentConstraints"
        },
        "description": {
          "type": "string",
          "minLength": 1
        },
        "distributions": {
          "$ref": "#/definitions/segmentDistributions"
        },
        "id": {
          "type": "integer",
          "format": "int64",
          "minimum": 1,
          "readOnly": true
        },
        "rank": {
          "type": "integer",
          "format": "int64",
          "minimum": 0
        },
        "rolloutPercent": {
          "type": "integer",
          "format": "int64",
          "maximum": 100,
          "minimum": 0
        }
      }
    },
    "segmentConstraints": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/constraint"
      },
      "x-go-gen-location": "models"
    },
    "segmentDebugLog": {
      "type": "object",
      "properties": {
        "msg": {
          "type": "string"
        },
        "segmentID": {
          "type": "integer",
          "format": "int64",
          "minimum": 1
        }
      }
    },
    "segmentDistributions": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/distribution"
      },
      "x-go-gen-location": "models"
    },
    "variant": {
      "type": "object",
      "required": [
        "key"
      ],
      "properties": {
        "attachment": {
          "type": "object"
        },
        "id": {
          "type": "integer",
          "format": "int64",
          "minimum": 1,
          "readOnly": true
        },
        "key": {
          "type": "string",
          "minLength": 1
        }
      }
    }
  }
}`))
}

import React, { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  Select,
  Flex,
  NumberInput,
  Checkbox,
  Alert,
} from "@mantine/core";
import { MdInfo } from "react-icons/md";
import toast from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";
import { useModal } from "../../../store/useModal";

type JSONValue = string | number | boolean | null | object;

interface EditNodeModalState {
  key: string | null;
  value: JSONValue;
  type: "string" | "number" | "boolean" | "null";
}

const parseValue = (value: any, type: string): JSONValue => {
  if (type === "null") return null;
  if (type === "boolean") return value === "true" || value === true;
  if (type === "number") {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
  return String(value);
};

const valueToString = (value: JSONValue): string => {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

export const EditNodeModal = ({ opened, onClose }: ModalProps) => {
  const selectedNode = useGraph(state => state.selectedNode);
  const json = useJson(state => state.json);
  const setJson = useJson(state => state.setJson);
  const setVisible = useModal(state => state.setVisible);
  const [editState, setEditState] = useState<EditNodeModalState>({
    key: null,
    value: "",
    type: "string",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNode && opened) {
      const textRow = selectedNode.text[0];
      setEditState({
        key: textRow.key || null,
        value: textRow.value !== null ? textRow.value : "",
        type: (textRow.type === "object" || textRow.type === "array"
          ? "null"
          : textRow.type) as "string" | "number" | "boolean" | "null",
      });
      setError(null);
    }
  }, [selectedNode, opened]);

  const updateJsonAtPath = (obj: any, path: string[], newValue: JSONValue, newKey?: string) => {
    let current = obj;
    
    // Navigate to the parent of the target
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (Array.isArray(current)) {
        current = current[Number(segment)];
      } else {
        current = current[segment];
      }
    }

    const lastSegment = path[path.length - 1];
    
    // Handle array index
    if (Array.isArray(current)) {
      current[Number(lastSegment)] = newValue;
    } 
    // Handle object property with possible key change
    else if (newKey && newKey !== lastSegment) {
      // If key changed, delete old and set new (preserves other properties)
      delete current[lastSegment];
      current[newKey] = newValue;
    } 
    // Handle normal object property update (preserves other properties)
    else {
      current[lastSegment] = newValue;
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!selectedNode?.path) {
        setError("Unable to determine node path");
        return;
      }

      // Validate key if provided
      if (editState.key && typeof editState.key === "string") {
        if (!editState.key.trim()) {
          setError("Key cannot be empty");
          return;
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(editState.key)) {
          setError("Key must be a valid identifier");
          return;
        }
      }

      const parsedJson = JSON.parse(json);
      const newValue = parseValue(editState.value, editState.type);
      
      // Build the correct path for the specific property being edited
      const textRow = selectedNode.text[0];
      const targetPath = [...(selectedNode.path as string[])];
      
      // If this is a property with a key, append the key to the path
      if (textRow.key) {
        targetPath.push(textRow.key);
      }

      updateJsonAtPath(
        parsedJson,
        targetPath,
        newValue,
        editState.key && editState.key !== textRow.key ? editState.key : undefined
      );

      const updatedJson = JSON.stringify(parsedJson, null, 2);
      
      // Update both the file contents (for JSON editor) and JSON store (for visualization)
      useFile.getState().setContents({ contents: updatedJson, hasChanges: true });
      
      // Also immediately update the selected node to reflect changes in the modal
      // Convert the value to what will be displayed (booleans as strings)
      const displayValue = typeof newValue === "boolean" ? (newValue ? "true" : "false") : (newValue as string | number | null);
      
      const updatedNode: typeof selectedNode = {
        ...selectedNode,
        text: selectedNode.text.map((row, idx) => {
          if (idx === 0) {
            // Update the first row being edited
            return {
              ...row,
              key: editState.key || row.key,
              value: displayValue,
              type: editState.type as any,
            };
          }
          return row;
        }),
      };
      
      useGraph.getState().setSelectedNode(updatedNode);

      toast.success("Node updated successfully");
      onClose();
      
      // Reopen NodeModal to show updated content immediately
      setTimeout(() => {
        setVisible("NodeModal", true);
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update node";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reopen NodeModal when closing EditNodeModal
    setTimeout(() => {
      setVisible("NodeModal", true);
    }, 100);
  };

  return (
    <Modal
      size="md"
      opened={opened}
      onClose={handleClose}
      centered
      title="Edit Node"
      withCloseButton
    >
      <Stack gap="md" pb="md">
        {error && (
          <Alert icon={<MdInfo />} color="red" title="Error">
            {error}
          </Alert>
        )}

        {selectedNode?.text[0].key !== null && (
          <TextInput
            label="Key"
            placeholder="Enter key name"
            value={editState.key || ""}
            onChange={e => {
              setEditState(prev => ({ ...prev, key: e.currentTarget.value || null }));
              setError(null);
            }}
            disabled={!selectedNode?.text[0].key}
          />
        )}

        <Select
          label="Type"
          placeholder="Select type"
          value={editState.type}
          onChange={value => {
            setEditState(prev => ({
              ...prev,
              type: (value || "string") as "string" | "number" | "boolean" | "null",
            }));
          }}
          data={[
            { value: "string", label: "String" },
            { value: "number", label: "Number" },
            { value: "boolean", label: "Boolean" },
            { value: "null", label: "Null" },
          ]}
        />

        {editState.type === "string" && (
          <TextInput
            label="Value"
            placeholder="Enter string value"
            value={editState.value as string}
            onChange={e => {
              setEditState(prev => ({
                ...prev,
                value: e.currentTarget.value,
              }));
            }}
          />
        )}

        {editState.type === "number" && (
          <NumberInput
            label="Value"
            placeholder="Enter number value"
            value={Number(editState.value) || 0}
            onChange={value => {
              setEditState(prev => ({
                ...prev,
                value: value || 0,
              }));
            }}
          />
        )}

        {editState.type === "boolean" && (
          <Checkbox
            label="Value"
            checked={editState.value === true || editState.value === "true"}
            onChange={e => {
              setEditState(prev => ({
                ...prev,
                value: e.currentTarget.checked,
              }));
            }}
          />
        )}

        {editState.type === "null" && (
          <Text size="sm" c="dimmed">
            Value will be set to null
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isLoading}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

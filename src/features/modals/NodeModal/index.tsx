import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Group } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { MdEdit } from "react-icons/md";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import { useModal } from "../../../store/useModal";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

const isEditableNode = (nodeData: NodeData | null) => {
  if (!nodeData || !nodeData.text || nodeData.text.length === 0) return false;
  const textRow = nodeData.text[0];
  // Only allow editing primitive values (not objects or arrays)
  return textRow.type !== "object" && textRow.type !== "array";
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setVisible = useModal(state => state.setVisible);
  const isEditable = isEditableNode(nodeData);

  const handleEdit = () => {
    onClose();
    setTimeout(() => {
      setVisible("EditNodeModal", true);
    }, 100);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <CloseButton onClick={onClose} />
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            <CodeHighlight
              code={normalizeNodeData(nodeData?.text ?? [])}
              miw={350}
              maw={600}
              language="json"
              withCopyButton
            />
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
        {isEditable && (
          <Group justify="flex-end" mt="md">
            <Button
              size="sm"
              leftSection={<MdEdit size={16} />}
              onClick={handleEdit}
              color="blue"
            >
              Edit Node
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
};

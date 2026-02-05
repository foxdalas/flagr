<template>
  <div
    v-if="showEditor || markdown"
    id="editor"
  >
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
      integrity="sha384-41TLk51mEPibuqZ3qC5guTOeo30Zt7UUaWLUn0/VdpGRO6b3SXA6AaKxj1mYzgAT"
      crossorigin="anonymous"
    >
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"
      integrity="sha384-zh0CIslj3dQfbkMoSKqNGBVIC4kfFfrHY3lQ+SDPK0PMKQpiaLONuYVFD6KPfE67"
      crossorigin="anonymous"
    >

    <el-row :gutter="10">
      <el-col
        v-if="showEditor"
        :span="12"
      >
        <el-input
          v-model="input"
          type="textarea"
          :rows="12"
          placeholder="Please input"
          @change="syncMarkdown"
        />
      </el-col>
      <el-col :span="showEditor ? 12 : 24">
        <div
          class="markdown-body"
          v-html="compiledMarkdown"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import MarkdownIt from "markdown-it";
import mk from "@vscode/markdown-it-katex";
import xss from "xss";

const props = defineProps({
  showEditor: Boolean,
  markdown: {
    type: String,
    default: "",
  },
});
const emit = defineEmits(["update:markdown"]);
let md = MarkdownIt("commonmark");
md.use(mk);

const input = ref(props.markdown);
watch(() => props.markdown, (newVal) => {
  input.value = newVal;
});

const compiledMarkdown = computed(() => {
  return md.render(xss(input.value));
});

function syncMarkdown(val) {
  emit("update:markdown", val);
}
</script>

<style lang="less" scoped>
.markdown-body {
  background-color: #f6f8fa;
  padding: 0.5rem;
}
</style>

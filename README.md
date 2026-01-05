# Joshua-sList

## Introduction

### English

This is the English memorization app that Joshua himself used during his GRE prep.

Supports the following features:
1. Dark/Light mode
1. Add/Delete words
2. Use AI to add Chinese translations, example sentences, and parts of speech
3. Import/Export CSV
4. Word memorization (Chinese to English, English to Chinese)
5. Customizable field display

### 中文

这是Joshua自己在Gre备考期间使用的英语背诵程序。

支持以下功能：
1. 暗黑、亮色模式
1. 添加/删除单词
2. 使用AI进行中文、例句、词性补充
3. 导入导出CSV
4. 单词背诵（中到英、英到中）
5. 显示字段选择

### Deutsch

Dies ist ein Englisch-Vokabeltrainer, den Joshua selbst während seiner Vorbereitung auf den GRE-Test verwendet hat. 

Unterstützt werden folgende Funktionen:
1. Dunkler und heller Modus
2. Wörter hinzufügen/entfernen
3. Verwendung von KI zur Ergänzung von chinesischen Übersetzungen, Beispielsätzen und Wortarten
4. Import/Export von CSV-Dateien
5. Vokabelabfrage (Chinesisch-Englisch, Englisch-Chinesisch)
6. Anzeigefelder auswählen

## 建议使用方式

建议使用vscode[LiveServe](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)插件打开网页

## CSV格式样例

```csv
English,PartOfSpeech,Meaning,Example,Date
"insofar","adv.","到目前为止，在某一范围内","Insofar as I know, he is coming to the party.","2026-01-03T16:08:01.122Z"
"premise","n.","前提；假设","The argument is based on the premise that everyone is honest.","2026-01-03T15:53:59.529Z"
```

## AI-api调用示例

在根目录加入`api.json`或`api.yaml`，示例：
json:
```json
{
  "engine": "ai",
  "apiKey": "sk-xxx",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4.1-nano"
}
```
yaml:
```yaml
engine: ai
apiKey: sk-xxx
baseUrl: https://api.openai.com/v1
model: gpt-4.1-nano
```

注意：文件只需存在即可；缺失时会静默跳过。更新 api 文件后刷新页面即可生效。
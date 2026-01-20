% split_csv_random_40.m
% Randomly split a vocab CSV into 40 nearly-equal lists and save as List*_Random.csv

inFile = "Total.csv";   % <- 改成你的原始CSV文件名/路径
nLists = 40;

% 可复现：把 'shuffle' 改成固定数字 (例如 0)
rng(0);

header = ["English","PartOfSpeech","Meaning","Example","Date"];

% Read as strings (avoid datetime auto-conversion)
opts = detectImportOptions(inFile, ...
    'Delimiter', ',', ...
    'TextType', 'string', ...
    'VariableNamingRule', 'preserve');

% Force required columns to string (and keep only these columns in this order)
opts = setvartype(opts, header, "string");
T = readtable(inFile, opts);

% Reorder/keep columns exactly as required
T = T(:, header);

N = height(T);
if N == 0
    error("Input CSV has no data rows.");
end

% Random permutation
p = randperm(N);

% Nearly-equal split sizes
base = floor(N / nLists);
extra = mod(N, nLists); % first 'extra' lists get one more

startIdx = 1;
for k = 1:nLists
    thisSize = base + (k <= extra);
    idx = p(startIdx : startIdx + thisSize - 1);
    startIdx = startIdx + thisSize;

    outFile = sprintf("List%02d_Random.csv", k);
    writeQuotedCsv(outFile, T(idx, :), header);
end

fprintf("Done. Split %d rows into %d files.\n", N, nLists);

% ---------- local function ----------
function writeQuotedCsv(filename, Tsub, header)
    fid = fopen(filename, 'w');
    if fid < 0
        error("Failed to open output file: %s", filename);
    end

    % Write header with quotes
    fprintf(fid, '%s\n', join('"' + header + '"', ","));

    % Write rows: always quote fields, escape internal quotes by doubling
    data = table2cell(Tsub);
    nRows = size(data, 1);
    nCols = size(data, 2);

    for i = 1:nRows
        fields = strings(1, nCols);
        for j = 1:nCols
            s = string(data{i, j});
            if ismissing(s)
                s = "";
            end
            s = replace(s, """", """"""); % escape quotes for CSV
            fields(j) = '"' + s + '"';
        end
        fprintf(fid, '%s\n', join(fields, ","));
    end

    fclose(fid);
end

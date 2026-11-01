# Changelog

## 2026-11-01 nix preset の追加

### Added

- `extends/nix.json` を追加し、`default.json` の `extends` に加えた。`flake.nix` の input に付けた `# renovate:` 注記を読み、`github:<owner>/<repo>/<rev>` に固定した commit を更新対象として抽出する。`<name>.url` 形と attrset 形の両方に対応する。注記が url 行の直前に無い input は対象にならない。`default.json` を extends する repo では、注記付き input のバージョン更新が提案される。digest だけの更新は無効にし、major と minor は分けず input ごとに 1 件の更新にまとめる。nix manager を有効にし、lock file maintenance は共通設定に従う。
- カスタム datasource `github-branch-tip` を nix preset に定義した。`branch=` を付けた flake input では、commit が branch の先頭になった時刻を UTC の `YYYY.MM.DD.HH.MM.SS` 形式のバージョンにし、commit SHA を digest として扱う。branch 削除の記録は無視し、同じ commit の記録が複数あるときは最も古い時刻を使う。
- `task check:all` を追加した。CI と同じ検査として、全設定 JSON への `renovate-config-validator --strict` と `node --test` をローカルで実行する。`check:staged` と `check:merge` も同じ検査を走らせる。必要なのは `nix` だけで、Node.js と yarn は `nix shell` から用意する。
- `task accept:lookup` を追加した。参照元 repo (既定は `naa0yama-org/boilerplate-rust`、`ACCEPT_SOURCE` で変更可) を一時ディレクトリに clone し、`extends/nix.json` を当てた `renovate --dry-run=lookup` の結果を dep ごとに 1 行の JSON で出す。参照元の renovate 設定は読み込まない。nix manager の dep と更新 branch の一覧は stderr にも出す。network、ssh、`gh auth token` が必要なため `check:all` には含めない。
- `task accept:compare` を追加した。nix preset の提案と、参照元の clone で走らせた `devkit-flake-pin update` の計画を dep ごとに突き合わせ、食い違いがあれば exit 非 0 で止まる。`accept:lookup` と同じく `check:all` には含めない。

# Changelog

## 2026-11-01 nix preset の受け入れ検査の整備

### Changed

- `task accept:compare` の branch 一覧を、renovate が実際に生成する branch から作るようにした。更新がすべて保留中の branch も一覧に入り、packageRules で無効にした branch は入らない。このため `task accept:lookup` は renovate を trace ログレベルで走らせる。
- 受け入れ検査の待ち日数を、固定の 7 日ではなく `default.json` の `minimumReleaseAge` から読むようにした。値が `N days` の形でないときは、その値を示すメッセージを出して止まる。`default.json` の値は変えていない。
- `task accept:lookup` と `task accept:compare` の処理を `scripts/` の shell と `scripts/accept.mjs` に移した。判定の規則と出力は変わらない。
- `task check:all` (`check:staged`、`check:merge` も同じ) が `node --test` の後に `tests/` の bats の検査も走らせる。`nix shell` に `bats` と `jq` が加わる。
- README の nix preset の節に、注記の key の固定順 (`datasource`、`depName`、`packageName`、`branch`、`version`) を書いた。順を変えた注記は抽出されず renovate もエラーを出さないこと、`task accept:compare` がそれを MISMATCH として報告すること、7 日の待ちが `default.json` の `minimumReleaseAge` から来ることも書いた。

## 2026-11-01 nix preset の追加

### Added

- `extends/nix.json` を追加し、`default.json` の `extends` に加えた。`flake.nix` の input に付けた `# renovate:` 注記を読み、`github:<owner>/<repo>/<rev>` に固定した commit を更新対象として抽出する。`<name>.url` 形と attrset 形の両方に対応する。注記は `datasource`、`depName`、`packageName`、`branch`、`version` をこの順で並べた 1 行で、url 行の直前に置く。順序が違う注記、`branch=` の無い注記、url 行の直前に無い注記は対象にならない。`default.json` を extends する repo では、注記付き input のバージョン更新が提案される。digest だけの更新は無効にし、major と minor は分けず input ごとに 1 件の更新にまとめる。nix manager を有効にし、lock file maintenance は共通設定に従う。
- カスタム datasource `github-branch-tip` を nix preset に定義した。`branch=` を付けた flake input では、commit が branch の先頭になった時刻を UTC の `YYYY.MM.DD.HH.MM.SS` 形式のバージョンにし、commit SHA を digest として扱う。branch 削除の記録は無視し、同じ commit の記録が複数あるときは最も古い時刻を使う。
- `task check:all` を追加した。全設定 JSON への `renovate-config-validator --strict` を実行する。これは CI と同じ検査である。続けて `node --test` も実行するが、こちらはローカルだけで走り、CI では走らない。`check:staged` と `check:merge` も同じ検査を走らせる。必要なのは `nix` だけで、Node.js と yarn は `nix shell` から用意する。
- `task accept:lookup` を追加した。参照元 repo (既定は `naa0yama-org/boilerplate-rust`、`ACCEPT_SOURCE` で変更可) を一時ディレクトリに clone し、`extends/nix.json` を当てた `renovate --dry-run=lookup` の結果を dep ごとに 1 行の JSON で出す。参照元の renovate 設定は読み込まない。nix manager の dep と更新 branch の一覧は stderr にも出す。network、ssh、`gh auth token` が必要なため `check:all` には含めない。
- `task accept:compare` を追加した。nix preset の提案と、参照元の clone で走らせた `devkit-flake-pin update` の計画を dep ごとに突き合わせ、食い違いがあれば exit 非 0 で止まる。`accept:lookup` と同じく `check:all` には含めない。

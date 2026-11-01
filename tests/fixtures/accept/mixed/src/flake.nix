{
  inputs = {
    # renovate: datasource=custom.github-branch-tip depName=up-ok packageName=example-org/up-ok branch=main version=2026.04.01.00.00.00
    up-ok.url = "github:example-org/up-ok/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    # renovate: datasource=custom.github-branch-tip depName=still-ok packageName=example-org/still-ok branch=main version=2026.04.01.00.00.00
    still-ok.url = "github:example-org/still-ok/cccccccccccccccccccccccccccccccccccccccc";

    # renovate: datasource=custom.github-branch-tip depName=skip-recent packageName=example-org/skip-recent branch=main version=2026.04.01.00.00.00
    skip-recent.url = "github:example-org/skip-recent/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    # renovate: datasource=custom.github-branch-tip depName=skip-dup packageName=example-org/skip-dup branch=main version=2026.04.01.00.00.00
    skip-dup.url = "github:example-org/skip-dup/1111111111111111111111111111111111111111";

    # renovate: datasource=custom.github-branch-tip depName=nolookup packageName=example-org/nolookup branch=main version=2026.04.01.00.00.00
    nolookup.url = "github:example-org/nolookup/9999999999999999999999999999999999999999";

  };
}

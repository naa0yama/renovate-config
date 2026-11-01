{
  inputs = {
    # renovate: datasource=custom.github-branch-tip depName=still-ok packageName=example-org/still-ok branch=main version=2026.04.01.00.00.00
    still-ok.url = "github:example-org/still-ok/cccccccccccccccccccccccccccccccccccccccc";

    # renovate: datasource=custom.github-branch-tip depName=nolookup packageName=example-org/nolookup branch=main version=2026.04.01.00.00.00
    nolookup.url = "github:example-org/nolookup/9999999999999999999999999999999999999999";

  };
}

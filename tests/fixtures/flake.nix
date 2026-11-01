{
  description = "fixture flake for extract tests";

  inputs = {
    # renovate: datasource=custom.github-branch-tip depName=alpha-pkgs packageName=example-org/alpha-pkgs branch=alpha-unstable version=2026.01.02.03.04.05
    alpha-pkgs.url = "github:example-org/alpha-pkgs/1111111111111111111111111111111111111111";

    beta-fmt = {
      # renovate: datasource=custom.github-branch-tip depName=beta-fmt packageName=example-org/beta-fmt branch=main version=2026.02.03.04.05.06
      url = "github:example-org/beta-fmt/2222222222222222222222222222222222222222";
      inputs.alpha-pkgs.follows = "alpha-pkgs";
    };

    alpha-lib.url = "github:example-org/alpha-lib/3333333333333333333333333333333333333333";

    gamma-gap = {
      # renovate: datasource=custom.github-branch-tip depName=gamma-gap packageName=example-org/gamma-gap branch=main version=2026.03.04.05.06.07
      inputs.alpha-pkgs.follows = "alpha-pkgs";
      url = "github:example-org/gamma-gap/4444444444444444444444444444444444444444";
    };
  };

  outputs = { self, alpha-pkgs, ... }: { };
}

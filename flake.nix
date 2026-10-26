{
  description = "artifactory dev shell for NixOS. CI and cloud sessions don't use it.";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      # The npm workerd binary is dynamically linked and won't start on NixOS,
      # so miniflare runs it through Nix's glibc loader instead.
      workerd = pkgs.writeShellScriptBin "workerd" ''
        root=$(${pkgs.git}/bin/git rev-parse --show-toplevel 2>/dev/null || pwd)
        binary=$(ls -d \
          "$root"/node_modules/.pnpm/@cloudflare+workerd-linux-64@*/node_modules/@cloudflare/workerd-linux-64/bin/workerd \
          "$root"/node_modules/@cloudflare/workerd-linux-64/bin/workerd \
          2>/dev/null | sort -V | tail -n 1)
        if [ -z "$binary" ]; then
          echo "workerd: no @cloudflare/workerd-linux-64 under $root/node_modules; run pnpm install" >&2
          exit 1
        fi
        exec ${pkgs.glibc}/lib/ld-linux-x86-64.so.2 --library-path ${pkgs.glibc}/lib "$binary" "$@"
      '';
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pkgs.nodejs_22
          pkgs.pnpm
          pkgs.chromium
          workerd
        ];
        CHROME_PATH = "${pkgs.chromium}/bin/chromium";
        MINIFLARE_WORKERD_PATH = "${workerd}/bin/workerd";
      };
    };
}

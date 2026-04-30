{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    fenix.url = "github:nix-community/fenix";
    fenix.inputs.nixpkgs.follows = "nixpkgs";
    crane.url = "github:ipetkov/crane";
    rs-libreoffice-bindings.url = "github:macro-inc/rs-libreoffice-bindings/dev";
    rs-libreoffice-bindings.flake = false;
  };
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      fenix,
      crane,
      rs-libreoffice-bindings,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          system = system;
        };
        isDarwin = pkgs.stdenv.isDarwin;
        isLinux = pkgs.stdenv.isLinux;

        rustToolchain = fenix.packages.${system}.fromToolchainFile {
          file = ./rust/rust-toolchain.toml;
          sha256 = "sha256-qqF33vNuAdU5vua96VKVIwuc43j4EFeEXbjQ6+l4mO4=";
        };

        craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

        libraries =
          with pkgs;
          [
            openssl
            openssl.dev
            glib
            glib.dev
            libclang
          ]
          ++ pkgs.lib.optionals isLinux [
            glibc.dev
            gcc
          ]
          ++ pkgs.lib.optionals isDarwin [
            libiconv
          ];

        # Include Cargo sources plus the .sqlx offline query cache.
        # rs-libreoffice-bindings lives outside the repo; we import it explicitly
        # so the nix sandbox can resolve the path dep in convert_service.
        src =
          let
            sqlxFilter = path: _type: builtins.match ".*\\.sqlx/.*\\.json$" path != null;
            pdfiumFilter = path: _type: builtins.match ".*pdfium-lib/.*\\.(so|dylib)$" path != null;
            assetFilter = path: _type: builtins.match ".*\\.(md|html|txt|json|canvas)$" path != null;
            srcFilter = path: type: (sqlxFilter path type) || (pdfiumFilter path type) || (assetFilter path type) || (craneLib.filterCargoSources path type);
            cloudStorageSrc = pkgs.lib.cleanSourceWith {
              src = ./rust/cloud-storage;
              filter = srcFilter;
            };
            cSourceFilter = path: _type: builtins.match ".*\\.(c|h)$" path != null;
            libreofficeBindingsSrc = pkgs.lib.cleanSourceWith {
              src = rs-libreoffice-bindings;
              filter = path: type: (cSourceFilter path type) || (craneLib.filterCargoSources path type);
            };
          in
          pkgs.runCommand "cloud-storage-src" { } ''
            cp -rT ${cloudStorageSrc} $out
            chmod -R +w $out
            cp -rT ${libreofficeBindingsSrc} $out/rs-libreoffice-bindings
          '';

        commonArgs =
          {
            inherit src;
            pname = "cloud-storage";
            version = "0.1.0";
            strictDeps = true;
            buildInputs = libraries;
            nativeBuildInputs = with pkgs; [ pkg-config ];
            LIBCLANG_PATH = "${pkgs.libclang.lib}/lib";
            OPENSSL_NO_VENDOR = "1";
            SQLX_OFFLINE = "true";
            RUSTFLAGS = "-Dwarnings";
            RUSTDOCFLAGS = "-Dwarnings";
          }
          // pkgs.lib.optionalAttrs isLinux {
            LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath libraries}";
            BINDGEN_EXTRA_CLANG_ARGS = "-I${pkgs.glibc.dev}/include -I${pkgs.gcc.cc}/lib/gcc/${pkgs.stdenv.hostPlatform.config}/${pkgs.gcc.version}/include";
          };

        # Pre-built deps — this derivation is what Cachix caches to skip dep recompilation
        cargoArtifacts = craneLib.buildDepsOnly commonArgs;

        shellTools = with pkgs; [
          parallel
          docker-compose
          zip
          cargo-info
          cargo-udeps
          cargo-lambda
          cargo-deny
          cargo-nextest
          cargo-expand
          wasm-pack
          pkg-config
          bacon
          just
          just-lsp
          taplo
          bun
          pnpm
          sqlx-cli
          typescript-language-server
          nodejs_24
          pulumi
          pulumiPackages.pulumi-nodejs
          sops
          biome
          jq
          stripe-cli
          rustToolchain
        ];
      in
      {
        checks = {
          fmt = craneLib.cargoFmt {
            inherit src;
            pname = "cloud-storage";
            version = "0.1.0";
          };
          clippy = craneLib.cargoClippy (
            commonArgs
            // {
              inherit cargoArtifacts;
              cargoClippyExtraArgs = "--all-features -- -D warnings";
            }
          );
        };

        packages = {
          inherit cargoArtifacts;
          default = cargoArtifacts;
        };

        devShell = pkgs.mkShell (
          {
            buildInputs = shellTools ++ libraries;
            PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
            LIBCLANG_PATH = "${pkgs.libclang.lib}/lib";
            SOPS_KMS_ARN = "arn:aws:kms:us-east-1:569036502058:key/mrk-cab29bf948044eb79005a81f48d40e93,arn:aws:kms:us-west-1:569036502058:key/mrk-cab29bf948044eb79005a81f48d40e93";
          }
          // pkgs.lib.optionalAttrs isLinux {
            LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath libraries}";
            BINDGEN_EXTRA_CLANG_ARGS = "-I${pkgs.glibc.dev}/include -I${pkgs.gcc.cc}/lib/gcc/${pkgs.stdenv.hostPlatform.config}/${pkgs.gcc.version}/include";
          }
        );
      }
    );
}

const pickDocument = ({ path, title, status, summary }) => ({ path, title, status, summary });
const pickDocumentIndex = ({ path, title, status }) => ({ path, title, status, summary: "" });
const pickChange = ({ id, path, title, status }) => ({ id, path, title, status, summary: "" });

export function compactDevelopmentPlan(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
    project: snapshot.project,
    technology: snapshot.technology.map(({ area, choice, status }) => ({ area, choice, status })),
    assembly: {
      blueprint: {
        status: snapshot.assembly.blueprint.status,
        preset: snapshot.assembly.blueprint.preset,
        visualIntegration: snapshot.assembly.blueprint.visualIntegration,
        pageSet: snapshot.assembly.blueprint.pageSet,
        setup: snapshot.assembly.blueprint.setup,
        selections: snapshot.assembly.blueprint.selections,
        providers: snapshot.assembly.blueprint.providers,
      },
      catalog: {
        schemaVersion: snapshot.assembly.catalog.schemaVersion,
        catalogVersion: snapshot.assembly.catalog.catalogVersion,
        policies: snapshot.assembly.catalog.policies,
        presets: snapshot.assembly.catalog.presets,
        packs: snapshot.assembly.catalog.packs.map((pack) => ({
          id: pack.id,
          kind: pack.kind,
          name: pack.name,
          version: pack.version,
          status: pack.status,
          delivery: pack.delivery,
          targets: pack.targets,
          ownership: pack.ownership,
          source: pack.source?.map(({ name, relationship }) => ({ name, relationship })) || [],
          updatePolicy: pack.updatePolicy,
        })),
      },
      providerCatalog: snapshot.assembly.providerCatalog,
      pageCatalog: {
        schemaVersion: snapshot.assembly.pageCatalog.schemaVersion,
        catalogVersion: snapshot.assembly.pageCatalog.catalogVersion,
        policy: snapshot.assembly.pageCatalog.policy,
        pages: snapshot.assembly.pageCatalog.pages.map((page) => ({
          id: page.id,
          packId: page.packId,
          name: page.name,
          route: page.route,
          group: page.group,
          renderer: page.renderer,
          required: page.required,
          defaultSelected: page.defaultSelected,
          status: page.status,
        })),
      },
      materialization: snapshot.assembly.materialization,
      visualIntegration: snapshot.assembly.visualIntegration,
    },
    modules: snapshot.modules.map(pickDocument),
    changes: snapshot.changes.map(pickChange),
    documents: snapshot.documents.map(pickDocumentIndex),
    environments: snapshot.environments,
    cloudflare: snapshot.cloudflare,
    orchestration: snapshot.orchestration,
    release: snapshot.release,
    documentation: snapshot.documentation,
  };
}

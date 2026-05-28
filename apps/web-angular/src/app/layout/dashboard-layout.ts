import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Shell layout: sidebar + a nested <router-outlet> for the dashboard children.
 * It's the layout route's component; feature pages render inside it.
 */
@Component({
  selector: 'app-dashboard-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex min-h-screen">
      <aside class="w-56 shrink-0 border-r border-gray-200 p-4">
        <div class="mb-6 text-lg font-bold">Meta Ads</div>
        <nav class="flex flex-col gap-1 text-sm">
          <a
            class="rounded px-2 py-1.5 hover:bg-gray-100"
            routerLink="/campaigns"
            routerLinkActive="bg-gray-100 font-medium"
            [routerLinkActiveOptions]="{ exact: true }"
            >Campañas</a
          >
          <a class="rounded px-2 py-1.5 hover:bg-gray-100" routerLink="/campaigns/new" routerLinkActive="bg-gray-100 font-medium"
            >Nueva campaña</a
          >
          <a class="rounded px-2 py-1.5 hover:bg-gray-100" routerLink="/clients" routerLinkActive="bg-gray-100 font-medium"
            >Clientes</a
          >
        </nav>
      </aside>
      <main class="flex-1 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class DashboardLayout {}

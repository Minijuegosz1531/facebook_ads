import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Toast } from './shared/components/toast';

/** Root component: hosts the top-level router-outlet and the global toast. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Toast],
  template: `
    <router-outlet />
    <app-toast />
  `,
})
export class App {}

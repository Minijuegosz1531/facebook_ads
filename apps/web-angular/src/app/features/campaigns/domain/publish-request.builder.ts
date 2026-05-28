import { BudgetType, Client, PublishFromJobRequest } from '../../../shared/models/api.models';

/** The campaign form's value, gathered before publishing. */
export interface CampaignFormValue {
  name: string;
  description: string;
  objective: string;
  budgetType: BudgetType;
  budgetAmount: number; // cents
  country: string;
  linkUrl: string;
}

/**
 * # Pattern: Builder
 *
 * Publishing needs a payload assembled from three different sources — the chosen
 * client, the campaign form, and the analyst's image/copy selection. The Builder
 * collects them through small, intention-revealing steps and validates once in
 * `build()`, instead of constructing a 12-field object literal inline at the
 * call site.
 */
export class PublishRequestBuilder {
  private req: Partial<PublishFromJobRequest> = { image_index: 0, copy_index: 0 };

  forJob(jobId: string): this {
    this.req.job_id = jobId;
    return this;
  }

  forClient(client: Client): this {
    this.req.client_id = client.id;
    this.req.ad_account_id = client.meta_ad_account_id;
    this.req.page_id = client.meta_page_id ?? '';
    this.req.pixel_id = client.meta_pixel_id;
    return this;
  }

  withCampaign(form: CampaignFormValue): this {
    this.req.name = form.name;
    this.req.objective = form.objective;
    this.req.budget_type = form.budgetType;
    this.req.budget_amount = form.budgetAmount;
    this.req.link_url = form.linkUrl;
    return this;
  }

  withSelection(imageIndex: number, copyIndex: number): this {
    this.req.image_index = imageIndex;
    this.req.copy_index = copyIndex;
    return this;
  }

  build(): PublishFromJobRequest {
    const required: (keyof PublishFromJobRequest)[] = [
      'job_id',
      'client_id',
      'ad_account_id',
      'name',
      'objective',
      'budget_type',
      'page_id',
      'link_url',
    ];
    const missing = required.filter((k) => !this.req[k]);
    if (missing.length > 0) {
      throw new Error(`PublishRequest incompleto: faltan ${missing.join(', ')}`);
    }
    return this.req as PublishFromJobRequest;
  }
}

import type { EmailClassification } from '$lib/types/email';

let currentTab = $state<EmailClassification>('primary');

export const classificationStore = {
	get currentTab() {
		return currentTab;
	},
	set currentTab(value: EmailClassification) {
		currentTab = value;
	}
};

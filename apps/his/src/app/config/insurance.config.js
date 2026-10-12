export const INSURANCE_CONFIG = {
    environment: 'production',
    providers: {
        tamin: { providerId: 'prov_tamin_01', name: 'بیمه تأمین اجتماعی', code: 'TAMIN', apiUrl: '', tokenUrl: '', clientId: '', clientSecret: '', enabled: true, timeoutMs: 10000 },
        salamat: { providerId: 'prov_salamat_02', name: 'بیمه سلامت ایران', code: 'SALAMAT', apiUrl: '', tokenUrl: '', clientId: '', clientSecret: '', enabled: true, timeoutMs: 10000 },
    }
};

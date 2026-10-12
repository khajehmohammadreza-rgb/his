"""Optional trusted local HTTPS. Generates a private local CA and server certificate; never share CA private key."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import ipaddress

def ensure_tls(directory,ips):
    from cryptography import x509
    from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
    from cryptography.hazmat.primitives import hashes,serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    ca_crt=directory/'bastiyan-local-CA.crt'
    ca_key=directory/'bastiyan-local-CA-private.key'
    leaf_crt=directory/'bastiyan-server.crt'
    leaf_key=directory/'bastiyan-server.key'
    utc=datetime.now(timezone.utc)
    if ca_crt.exists() and ca_key.exists():
        ca=x509.load_pem_x509_certificate(ca_crt.read_bytes())
        private=serialization.load_pem_private_key(ca_key.read_bytes(),password=None)
        # Repair legacy certificates generated without a Subject Key Identifier.
        try: ca.extensions.get_extension_for_class(x509.SubjectKeyIdentifier)
        except x509.ExtensionNotFound:
            name=ca.subject
            ca=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(private.public_key())
                .serial_number(x509.random_serial_number()).not_valid_before(utc-timedelta(minutes=5))
                .not_valid_after(utc+timedelta(days=2000))
                .add_extension(x509.BasicConstraints(ca=True,path_length=0),critical=True)
                .add_extension(x509.SubjectKeyIdentifier.from_public_key(private.public_key()),critical=False)
                .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(private.public_key()),critical=False)
                .add_extension(x509.KeyUsage(digital_signature=True,key_encipherment=False,content_commitment=False,data_encipherment=False,key_agreement=False,key_cert_sign=True,crl_sign=True,encipher_only=False,decipher_only=False),critical=True)
                .sign(private,hashes.SHA256()))
            ca_crt.write_bytes(ca.public_bytes(serialization.Encoding.PEM))
    else:
        private=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Bastiyan Collector Local CA')])
        ca=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(private.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(utc-timedelta(minutes=5)).not_valid_after(utc+timedelta(days=2000))
            .add_extension(x509.BasicConstraints(ca=True,path_length=0),critical=True)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(private.public_key()),critical=False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(private.public_key()),critical=False)
            .add_extension(x509.KeyUsage(digital_signature=True,key_encipherment=False,content_commitment=False,data_encipherment=False,key_agreement=False,key_cert_sign=True,crl_sign=True,encipher_only=False,decipher_only=False),critical=True)
            .sign(private,hashes.SHA256()))
        ca_crt.write_bytes(ca.public_bytes(serialization.Encoding.PEM))
        ca_key.write_bytes(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption()))
        try:ca_key.chmod(0o600)
        except OSError:pass
    # A stable CA identifies the center; keep the leaf certificate if IPs are still covered.
    # Reissuing a certificate on every restart breaks pinned desktop/mobile clients.
    if leaf_crt.exists() and leaf_key.exists():
        try:
            leaf=x509.load_pem_x509_certificate(leaf_crt.read_bytes())
            san=leaf.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
            current_ips={str(v) for v in san.get_values_for_type(x509.IPAddress)}
            expected_ips={'127.0.0.1',*ips}
            is_current=(leaf.not_valid_after_utc>utc+timedelta(days=30) and
                        leaf.not_valid_before_utc<utc and
                        expected_ips.issubset(current_ips) and leaf.issuer==ca.subject)
            if is_current:
                return leaf_crt,leaf_key
        except (ValueError, OSError, x509.ExtensionNotFound, AttributeError):
            pass
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'bastiyan-collector.local')])
    sans=[x509.DNSName('localhost'),x509.DNSName('bastiyan-collector.local'),x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]
    for ip in ips:
        try:sans.append(x509.IPAddress(ipaddress.ip_address(ip)))
        except ValueError:pass
    cert=(x509.CertificateBuilder().subject_name(name).issuer_name(ca.subject).public_key(key.public_key()).serial_number(x509.random_serial_number())
       .not_valid_before(utc-timedelta(minutes=5)).not_valid_after(utc+timedelta(days=365))
       .add_extension(x509.BasicConstraints(ca=False,path_length=None),critical=True)
       .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()),critical=False)
       .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(private.public_key()),critical=False)
       .add_extension(x509.KeyUsage(digital_signature=True,key_encipherment=True,content_commitment=False,data_encipherment=False,key_agreement=False,key_cert_sign=False,crl_sign=False,encipher_only=False,decipher_only=False),critical=True)
       .add_extension(x509.SubjectAlternativeName(sans),critical=False)
       .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),critical=False)
       .sign(private,hashes.SHA256()))
    leaf_crt.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    leaf_key.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption()))
    try:leaf_key.chmod(0o600)
    except OSError:pass
    return leaf_crt,leaf_key

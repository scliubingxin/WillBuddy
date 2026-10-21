#!/usr/bin/env python3
"""Verify every CodeDirectory page hash of ad-hoc thin/fat Mach-O files.
Does not claim Developer ID trust, macOS resource-seal or Gatekeeper validation.
"""
import hashlib
from pathlib import Path
import struct


def verify(data):
    if data[:4] in [bytes.fromhex('cafebabe'),bytes.fromhex('cafebabf')]:
        wide=data[:4]==bytes.fromhex('cafebabf');count=struct.unpack_from('>I',data,4)[0];pages=0
        for i in range(count):
            if wide:off,size=struct.unpack_from('>QQ',data,8+i*32+8)
            else:off,size=struct.unpack_from('>II',data,8+i*20+8)
            pages+=verify(data[off:off+size])
        return pages
    if data[:4] not in [bytes.fromhex('cffaedfe'),bytes.fromhex('cefaedfe')]:raise ValueError('not supported little-endian Mach-O')
    pos=32 if data[:4]==bytes.fromhex('cffaedfe') else 28
    commands=struct.unpack_from('<I',data,16)[0];signature=None
    for _ in range(commands):
        cmd,size=struct.unpack_from('<II',data,pos)
        if size<8:raise ValueError('invalid load command size')
        if cmd==0x1d:
            off,length=struct.unpack_from('<II',data,pos+8);signature=data[off:off+length]
        pos+=size
    if signature is None:raise ValueError('missing code signature')
    magic,length,count=struct.unpack_from('>III',signature,0)
    if magic!=0xfade0cc0 or length>len(signature):raise ValueError('invalid signature superblob')
    directories=0;pages=0;blobs={}
    for i in range(count):
        kind,off=struct.unpack_from('>II',signature,12+i*8);blob_length=struct.unpack_from('>I',signature,off+4)[0];blobs[kind]=signature[off:off+blob_length]
    for kind,blob in blobs.items():
        if kind!=0 and not 0x1000<=kind<=0x1005:continue
        if struct.unpack_from('>I',blob)[0]!=0xfade0c02:raise ValueError('invalid code directory')
        _,flags,hash_offset,_,special,slots,limit=struct.unpack_from('>7I',blob,8)
        hash_size,hash_type,_,page_log=struct.unpack_from('>4B',blob,36)
        if not flags&2:raise ValueError('expected ad-hoc signature')
        if limit>len(data):raise ValueError('code limit outside binary')
        hash_name={1:'sha1',2:'sha256',3:'sha256',4:'sha384'}.get(hash_type)
        if not hash_name:raise ValueError('unsupported hash type')
        page_size=2**page_log if page_log else max(limit,1)
        if slots!=(limit+page_size-1)//page_size:raise ValueError('code slot count mismatch')
        for slot in range(slots):
            digest=hashlib.new(hash_name,data[slot*page_size:min((slot+1)*page_size,limit)]).digest()[:hash_size]
            expected=blob[hash_offset+slot*hash_size:hash_offset+(slot+1)*hash_size]
            if digest!=expected:raise ValueError('code page hash mismatch')
        # Requirements and entitlement blobs are sealed as special code slots.
        for slot,blob_kind in [(2,2),(5,5),(7,7)]:
            if slot<=special and blob_kind in blobs:
                expected=blob[hash_offset-slot*hash_size:hash_offset-(slot-1)*hash_size]
                if hashlib.new(hash_name,blobs[blob_kind]).digest()[:hash_size]!=expected:raise ValueError('special code slot mismatch')
        directories+=1;pages+=slots
    if not directories:raise ValueError('no code directory')
    return pages

if __name__=='__main__':
    import sys
    for name in sys.argv[1:]:print(name,verify(Path(name).read_bytes()),'verified code pages')

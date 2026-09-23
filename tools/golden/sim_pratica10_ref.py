M=0xffffffff
imem=[0]*32
for i,w in enumerate([0x11090001,0x21080002,0xAD880000,0x8D900000,0x020A4022,0x08000000]): imem[i]=w
R=[0]*32; R[8]=5;R[9]=5;R[10]=1;R[12]=4
D=[0]*64; D[0]=5; D[8]=7
sx=lambda v:(v-0x10000 if v&0x8000 else v)&M
s32=lambda v:v-(1<<32) if v&0x80000000 else v
pc=0
for cyc in range(1,19):
    ins=imem[(pc>>2)&31]; op=ins>>26; rs=(ins>>21)&31; rt=(ins>>16)&31; rd=(ins>>11)&31; imm=sx(ins&0xffff); fn=ins&63
    c=dict(RegDst=0,Branch=0,MemRead=0,MemtoReg=0,ALUOp=0,MemWrite=0,ALUSrc=0,RegWrite=0,Jump=0)
    if op==0: c.update(RegDst=1,RegWrite=1,ALUOp=2)
    elif op==8: c.update(RegWrite=1,ALUSrc=1)
    elif op==35: c.update(RegWrite=1,ALUSrc=1,MemRead=1,MemtoReg=1)
    elif op==43: c.update(ALUSrc=1,MemWrite=1)
    elif op==4: c.update(Branch=1,ALUOp=1)
    elif op==2: c.update(Jump=1)
    A=R[rs] if rs else 0; B=R[rt] if rt else 0
    b=imm if c['ALUSrc'] else B
    a=c['ALUOp']
    alu={0:0b010,1:0b110}.get(a) if a!=2 else {32:0b010,34:0b110,36:0,37:1,42:0b111}.get(fn,0)
    if alu==0b010: res=(A+b)&M
    elif alu==0b110: res=(A-b)&M
    elif alu==0: res=A&b
    elif alu==1: res=A|b
    elif alu==7: res=1 if s32(A)<s32(b) else 0
    zero=int(res==0)
    wa=res>>2&63
    md=0
    if c['MemRead']:
        md=sum((D[(wa*4+k)] if wa*4+k<64 else 0)<<(8*k) for k in range(4))
    wd=md if c['MemtoReg'] else res
    wr=rd if c['RegDst'] else rt
    pc4=(pc+4)&M; bt=(pc4+((imm<<2)&M))&M; jt=(pc4&0xf0000000)|((ins&0x3ffffff)<<2)
    npc = jt if c['Jump'] else (bt if c['Branch'] and zero else pc4)
    print(f"c{cyc:02d} PC={pc:02d} ins={ins:08X} op={op} ALUctl={alu:03b} A={s32(A)} B={s32(b)} res={s32(res)} Z={zero} wr=${wr}<-{s32(wd) if c['RegWrite'] else '-'} nextPC={npc}  | $8={R[8]} $16={R[16]} M[4]={D[4]}")
    if c['RegWrite'] and wr: R[wr]=wd
    if c['MemWrite']:
        for k in range(4): D[wa*4+k]=(B>>(8*k))&255
    pc=npc

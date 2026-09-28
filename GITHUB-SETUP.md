# 安装完整 Enterprise AI 项目

绑定：mrvgao/enterprise-ai-fresh-start-20260928 / main；场景：retail_plus；语言：typescript；任务：t1。

## 命令安装（推荐）

先安装 Git、Python 3.9+ 和 GitHub CLI（gh）；TypeScript 本地测试另需 Node 24+。clone 自己的仓库，在绑定分支的项目根目录打开终端。在 Agentist → 我的学习 → 实验管理 → 权限中心下载个人 Enterprise-AI.json，保存在仓库外，禁止提交凭证。

macOS / Linux（bash 或 zsh）：

~~~bash
curl -fL 'https://agentist.org/lab/enterprise-ai/install.py' -o install-enterprise-ai.py
# 查看下载的脚本后执行：
python3 install-enterprise-ai.py --binding 179df496-f5f3-4db3-884c-7dc1f8ae18e1 --config "/绝对路径/Enterprise-AI.json" --mode new
~~~

Windows PowerShell（不需要 bash）：

~~~powershell
Invoke-WebRequest -Uri 'https://agentist.org/lab/enterprise-ai/install.py' -OutFile install-enterprise-ai.py
# 查看下载的脚本后执行：
py -3 install-enterprise-ai.py --binding 179df496-f5f3-4db3-884c-7dc1f8ae18e1 --config "C:\Users\你的用户名\Enterprise-AI.json" --mode new
~~~

全新项目用 --mode new：安装完整包，包括 agent/、scripts/、tests/、材料和文档，并自动放好 .github/workflows/hyper-lab.yml。已有 Agent 项目用 --mode existing：只安装工作流、终端辅助脚本和本说明，不修改 agent/、package.json、测试和材料。安装器先核对仓库、分支，以及已有 Agent 的场景与语言；遇到不同内容的同名文件会列出冲突并停止，不自动覆盖。先自行备份/移走冲突文件再重试。相同内容可重复安装。七题作业需先 clone 作业，用 --mode existing；不会安装答案。

## 手动下载 ZIP 的替代方式

全新项目要复制解压包里的全部内容，不是只复制 hyper-lab.yml。macOS/Linux 执行 mkdir -p .github/workflows，再执行 cp -i hyper-lab.yml .github/workflows/hyper-lab.yml。Windows PowerShell 执行 New-Item -ItemType Directory -Force .github/workflows，再执行 Copy-Item hyper-lab.yml .github/workflows/hyper-lab.yml -Confirm。仅放在根目录的 YAML 不会触发 Actions。已有项目建议用安装器 --mode existing，保护自己的源码。

## 让 git push 在终端显示评测

首次先运行 gh auth login。每次新开 bash/zsh 终端执行：

~~~bash
source scripts/git-evaluate.sh
~~~

每次新开 Windows PowerShell 执行：

~~~powershell
. .\scripts\git-evaluate.ps1
~~~

若执行策略阻止 PowerShell 脚本，不要降低系统策略，直接运行 py -3 scripts/git-evaluate.py push；macOS/Linux 对应 python3 scripts/git-evaluate.py push。已有 git alias/function 不会覆盖。Windows cmd.exe 用 Python 命令，不使用 source 或 PowerShell 脚本。

先用 git status、git diff 检查要提交的内容。新项目需提交完整工程文件，包括 agent/、scripts/ 和 .github/workflows/hyper-lab.yml，绝不提交个人配置。然后 commit，再 git push。终端先显示阶段与等待时间，报告完成后显示逐案例结果、总数和网页链接；只是等待 GitHub 的同一任务，不会重复评测。没有新提交不会产生新评测；变更还需匹配工作流路径。Ctrl-C 只停止本地等待，不取消远程任务。逐案例明细在报告完成后展示，不伪造实时进度。

网页是同一轮运行的可视化视图。GitHub Actions 权限/计费限制可能导致任务未启动；completed 不代表通过。初始模板只针对 t1 接入检查，不是完整业务答案。安装不会修改计费配置、发起评测或购买模型额度。

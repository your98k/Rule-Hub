# -*- coding: utf-8 -*-
"""loon_adapter 的单元测试：既覆盖「能转」，也覆盖「必须拒绝」。

运行：
    cd /workspace/rulehub-converter && python3 -m unittest -v test_loon_adapter
"""

from __future__ import annotations

import textwrap
import unittest

import yaml

import loon_adapter as L


def convert(text: str, **kwargs) -> dict:
    return L.convert(textwrap.dedent(text).strip() + "\n", **kwargs)


def load(text: str, **kwargs) -> dict:
    """转换并解析 YAML，确保输出真的是可导入的覆写。"""

    result = convert(text, **kwargs)
    data = yaml.safe_load(result["yaml"])
    assert isinstance(data, dict), "输出不是 YAML 映射"
    return data


class MetadataTests(unittest.TestCase):
    def test_metadata_fields_and_scalar_category(self):
        data = load(
            """
            #!name = 演示插件
            #!desc = 第一行说明
                 第二行说明
            #!author = 上游作者
            #!homepage = https://example.com
            #!icon = https://example.com/i.png
            #!date = 2026-11-16
            #!tag = 去广告, 功能增强
            #!openUrl = https://example.com/app
            """
        )
        self.assertEqual(data["name"], "演示插件")
        # desc 必须折叠成单行：面板的头部解析遇到空行/缩进会截断
        self.assertEqual(data["desc"], "第一行说明 第二行说明")
        self.assertNotIn("\n", data["desc"])
        # category 是标量字符串，不是数组，也不挂 #!replace
        self.assertEqual(data["category"], "去广告, 功能增强")
        self.assertIsInstance(data["category"], str)
        self.assertEqual(data["openUrl"], "https://example.com/app")
        self.assertEqual(data["author"], "上游作者")
        self.assertEqual(data["homepage"], "https://example.com")

    def test_loon_only_metadata_is_dropped_with_warning(self):
        result = convert(
            """
            #!name = x
            #!system = iOS
            #!loon_version = 3.5.1(983)
            """
        )
        self.assertEqual(result["blocked"], [])
        joined = " ".join(result["warnings"])
        self.assertIn("system", joined)
        self.assertIn("loon_version", joined)


    def test_literal_backslash_n_in_desc_is_flattened(self):
        data = load(
            r"""
            #!name = x
            #!desc = 第一句\n第二句
            """
        )
        self.assertEqual(data["desc"], "第一句 第二句")
        self.assertNotIn("\\n", data["desc"])

class RuleTests(unittest.TestCase):
    def test_rules_policies_and_final(self):
        data = load(
            """
            #!name = x
            [Rule]
            DOMAIN-SUFFIX,ads.example.com,REJECT
            DOMAIN,api.example.com,DIRECT
            IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
            FINAL,DIRECT
            """
        )
        self.assertEqual(
            data["rules"],
            [
                "DOMAIN-SUFFIX,ads.example.com,REJECT",
                "DOMAIN,api.example.com,DIRECT",
                "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
                "MATCH,DIRECT",
            ],
        )

    def test_and_rule_keeps_parenthesised_value(self):
        data = load(
            """
            #!name = x
            [Rule]
            AND,((DOMAIN-KEYWORD,ads),(NETWORK,tcp)),REJECT
            """
        )
        self.assertEqual(data["rules"], ["AND,((DOMAIN-KEYWORD,ads),(NETWORK,tcp)),REJECT"])

    def test_unknown_rule_type_is_blocked_with_line(self):
        result = convert(
            """
            #!name = x
            [Rule]
            DOMAIN-SUFFIX,ok.example.com,DIRECT
            SOCKSRULE,evil.example.com,REJECT
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertEqual(result["blocked"][0]["line"], 4)
        self.assertIn("SOCKSRULE", result["blocked"][0]["reason"])
        # 合法的仍然写进去了
        self.assertIn("ok.example.com", result["yaml"])

    def test_proxy_policy_is_blocked_without_mapping(self):
        """PROXY 在 Stash 里没有同义内置策略，必须要求显式映射而不是凭空造组。"""

        result = convert(
            """
            #!name = x
            [Rule]
            DOMAIN,api.example.com,PROXY
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        reason = result["blocked"][0]["reason"]
        self.assertIn("PROXY", reason)
        self.assertIn("映射", reason)
        self.assertEqual(result["yaml"].count("rules:"), 0)

    def test_proxy_in_final_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rule]
            FINAL,PROXY
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("PROXY", result["blocked"][0]["reason"])

    def test_custom_policy_name_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rule]
            DOMAIN-SUFFIX,ads.example.com,节点选择
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("策略", result["blocked"][0]["reason"])

    def test_process_rule_is_blocked_for_ios(self):
        result = convert(
            """
            #!name = x
            [Rule]
            PROCESS-NAME,Telegram,REJECT
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("PROCESS-NAME", result["blocked"][0]["reason"])

    def test_pre_matching_requires_reject_target(self):
        result = convert(
            """
            #!name = x
            [Rule]
            DOMAIN-SUFFIX,ads.example.com,DIRECT,pre-matching
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("pre-matching", result["blocked"][0]["reason"])


class LegacyRewriteTests(unittest.TestCase):
    def test_reject_family_with_dash_placeholder(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            ^https://a\\.example\\.com/1 - reject
            ^https://a\\.example\\.com/2 - reject-dict
            ^https://a\\.example\\.com/3 - reject-array
            ^https://a\\.example\\.com/4 - reject-img
            """
        )
        self.assertEqual(
            data["http"]["url-rewrite"],
            [
                "^https://a\\.example\\.com/1 - reject",
                "^https://a\\.example\\.com/2 - reject-dict",
                "^https://a\\.example\\.com/3 - reject-array",
                "^https://a\\.example\\.com/4 - reject-img",
            ],
        )

    def test_url_replace_and_redirect(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            ^https://old\\.example\\.com/a https://new.example.com/a header
            ^https://r\\.example\\.com/x https://r.example.com/y 302
            """
        )
        # url-rewrite 必须是三段：pattern / target / action
        for entry in data["http"]["url-rewrite"]:
            self.assertEqual(len(entry.split(" ")), 3, entry)
        self.assertIn(
            "^https://old\\.example\\.com/a https://new.example.com/a transparent",
            data["http"]["url-rewrite"],
        )
        self.assertIn(
            "^https://r\\.example\\.com/x https://r.example.com/y 302",
            data["http"]["url-rewrite"],
        )

    def test_old_url_replace_with_capture_is_blocked(self):
        """旧版 $1 捕获与新版 ${name.1} 一致对待：Stash 无替换占位，必须 blocked。"""

        result = convert(
            """
            #!name = x
            [Rewrite]
            ^https://old\\.example\\.com/(.*) https://new.example.com/$1 header
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("捕获", result["blocked"][0]["reason"])
        self.assertNotIn("url-rewrite", result["yaml"])

    def test_old_redirect_with_capture_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rewrite]
            ^https://r\\.example\\.com/(.*) https://r.example.com/$1 302
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("捕获", result["blocked"][0]["reason"])


    def test_header_and_body_actions(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            ^https://api\\.example\\.com/a header-add X-Test 1
            ^https://api\\.example\\.com/b response-header-del X-Old
            ^https://api\\.example\\.com/c response-header-replace-regex X-Name /^old$/ new
            ^https://api\\.example\\.com/d response-body-replace-regex /"ads":true/ "ads":false
            ^https://api\\.example\\.com/e response-body-json-del data.ads
            """
        )
        self.assertEqual(
            data["http"]["header-rewrite"],
            [
                "^https://api\\.example\\.com/a request-add X-Test 1",
                "^https://api\\.example\\.com/b response-del X-Old",
                "^https://api\\.example\\.com/c response-replace-regex X-Name ^old$ new",
            ],
        )
        self.assertEqual(
            data["http"]["body-rewrite"],
            [
                '^https://api\\.example\\.com/d response-replace-regex "ads":true "ads":false',
                "^https://api\\.example\\.com/e response-json-del data.ads",
            ],
        )

    def test_unknown_legacy_action_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rewrite]
            ^https://api\\.example\\.com/a no-such-action 1
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertEqual(result["blocked"][0]["line"], 3)
        self.assertNotIn("url-rewrite", result["yaml"])


class NewRewriteTests(unittest.TestCase):
    def test_header_set_and_reject_pipeline(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            request if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/v1\\/splash/ then request.header.set("X-A", "1") | reject_dict(200)
            """
        )
        self.assertEqual(
            data["http"]["header-rewrite"],
            ["^https:\\/\\/api\\.example\\.com\\/v1\\/splash request-replace X-A 1"],
        )
        self.assertEqual(
            data["http"]["url-rewrite"],
            ["^https:\\/\\/api\\.example\\.com\\/v1\\/splash - reject-dict"],
        )

    def test_redirect_and_url_replace(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            request if ${url} ~= /^https:\\/\\/a\\.example\\.com\\/old/ then redirect(307, "https://a.example.com/new")
            request if ${url} ~= /^https:\\/\\/b\\.example\\.com\\/x/ then url.replace("https://b.example.com/y")
            """
        )
        self.assertIn(
            "^https:\\/\\/a\\.example\\.com\\/old https://a.example.com/new 307",
            data["http"]["url-rewrite"],
        )
        self.assertIn(
            "^https:\\/\\/b\\.example\\.com\\/x https://b.example.com/y transparent",
            data["http"]["url-rewrite"],
        )

    def test_json_jq_keeps_inner_pipe_and_quotes(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/cfg/ then response.json.jq(`.data.ads = [] | .data.name = "Stash"`)
            """
        )
        entry = data["http"]["body-rewrite"][0]
        self.assertIn("response-jq", entry)
        # jq 里的 | 与引号必须原样保留，不能被当成 Action 管道或被转义破坏
        self.assertIn('.data.ads = [] | .data.name = "Stash"', entry)

    def test_mock_response(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/splash/ then response.body.mock("json", `{"code":0,"data":[]}`, 200)
            """
        )
        mock = data["http"]["mock"][0]
        self.assertEqual(mock["match"], "^https:\\/\\/api\\.example\\.com\\/splash")
        self.assertEqual(mock["text"], '{"code":0,"data":[]}')
        self.assertEqual(mock["status-code"], 200)
        self.assertEqual(mock["headers"]["Content-Type"], "application/json")

    def test_url_replace_with_capture_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rewrite]
            request if ${url} ~= /^https:\\/\\/a\\.example\\.com(\\/.*)$/ as rest then url.replace("https://b.example.com${rest.1}")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("as", result["blocked"][0]["reason"])

    def test_reject_with_unsupported_status_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Rewrite]
            request if ${url} ~= /^https:\\/\\/a\\.example\\.com\\/x/ then reject(403)
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("403", result["blocked"][0]["reason"])

    def test_extra_condition_is_degraded_not_silent(self):
        result = convert(
            """
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\/x/ && ${response.status} == 200 then response.header.del("X-Ad")
            """
        )
        self.assertEqual(result["blocked"], [])
        self.assertEqual(len(result["degraded"]), 1)
        self.assertIn("status", result["degraded"][0]["reason"])
        # 仍然产出了可用的改写
        self.assertIn("response-del X-Ad", result["yaml"])


class ScriptTests(unittest.TestCase):
    def test_new_script_with_object_argument(self):
        data = load(
            """
            #!name = x
            [Argument]
            region = select,"CN","US",type=string,tag=地区
            level = input,3,type=number,tag=等级
            [Script]
            response if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/user/ then script("https://cdn.example.com/scripts/user.js", {${region}, ${level}}) with requires_body=true, timeout=15
            """
        )
        entry = data["http"]["script"][0]
        self.assertEqual(entry["name"], "user")
        self.assertEqual(entry["type"], "response")
        self.assertIs(entry["require-body"], True)
        self.assertEqual(entry["timeout"], 15)
        # 对象参数 → 逐字段 |json
        self.assertEqual(entry["argument"], '{"region":${args.region|json},"level":${args.level|json}}')
        self.assertEqual(data["script-providers"]["user"]["url"], "https://cdn.example.com/scripts/user.js")

    def test_legacy_http_script(self):
        data = load(
            """
            #!name = x
            [Argument]
            region = select,"CN","US",tag=地区
            [Script]
            http-response ^https://api\\.example\\.com/user script-path=https://cdn.example.com/u.js, requires-body=true, timeout=10, argument={region}
            """
        )
        entry = data["http"]["script"][0]
        self.assertEqual(entry["type"], "response")
        self.assertIs(entry["require-body"], True)
        self.assertEqual(entry["argument"], '{"region":${args.region|json}}')

    def test_cron_script(self):
        data = load(
            """
            #!name = x
            [Script]
            cron "0 8 * * *" then script("https://cdn.example.com/task.js") with timeout=60
            """
        )
        cron = data["cron"]["script"][0]
        self.assertEqual(cron["cron"], "0 8 * * *")
        self.assertEqual(cron["timeout"], 60)
        self.assertIn("task", data["script-providers"])

    def test_local_script_path_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Script]
            response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\// then script("scripts/a.js")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("http(s)", result["blocked"][0]["reason"])

    def test_response_script_without_url_guard_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Script]
            response if ${response.status} == 200 then script("https://cdn.example.com/a.js")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("url", result["blocked"][0]["reason"].lower())

    def test_unknown_with_field_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Script]
            response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\// then script("https://cdn.example.com/a.js") with wat=1
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("wat", result["blocked"][0]["reason"])

    def test_network_changed_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Script]
            network-changed then script("https://cdn.example.com/a.js")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("network-changed", result["blocked"][0]["reason"])


    def test_base64_mock(self):
        data = load(
            """
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https?:\\/\\/api\\.example\\.com\\/ad(\\?|$)/i then response.body.mock("base64", "eyJhIjoxfQ==", 200, true)
            """
        )
        mock = data["http"]["mock"][0]
        self.assertEqual(mock["base64"], "eyJhIjoxfQ==")
        self.assertNotIn("text", mock)
        self.assertEqual(mock["status-code"], 200)
        # base64 内容类型不写 Content-Type，避免把二进制标成 JSON
        self.assertNotIn("headers", mock)

    def test_tag_dropped_is_warning_not_degraded(self):
        result = convert(
            """
            #!name = x
            [Script]
            response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\// then script("https://cdn.example.com/a.js") with tag="[x]A", requires_body=true
            """
        )
        self.assertEqual(result["degraded"], [])
        self.assertTrue(any("tag" in w for w in result["warnings"]))
        # strict 仍然通过：tag 不影响配置语义
        L.convert_or_raise(
            textwrap.dedent(
                """
                #!name = x
                [Script]
                response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\// then script("https://cdn.example.com/a.js") with tag="[x]A"
                """
            ).strip()
            + "\n"
        )

class ArgumentTests(unittest.TestCase):
    def test_input_select_switch(self):
        data = load(
            """
            #!name = x
            [Argument]
            name = input,"Loon",type=string,tag=名称,desc=输入名称
            region = select,"CN","US",type=string,tag=地区
            level = select,1,2,3,type=number,tag=等级
            enabled = switch,true,type=boolean,tag=启用
            interval = input,30,type=number,tag=间隔
            """
        )
        self.assertEqual(data["arguments-version"], 1)
        args = data["arguments"]
        self.assertEqual(args["name"]["type"], "input")
        self.assertEqual(args["name"]["default"], "Loon")
        self.assertEqual(args["name"]["description"], "输入名称")
        self.assertEqual(args["region"]["type"], "select")
        self.assertEqual([o["value"] for o in args["region"]["options"]], ["CN", "US"])
        self.assertEqual(args["level"]["options"][0]["value"], 1)
        self.assertEqual(args["enabled"]["type"], "switch")
        self.assertIs(args["enabled"]["default"], True)
        self.assertEqual(args["interval"]["value-type"], "integer")
        self.assertEqual(args["interval"]["default"], 30)

    def test_unknown_control_is_blocked(self):
        result = convert(
            """
            #!name = x
            [Argument]
            weird = slider,1,10,tag=滑条
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("slider", result["blocked"][0]["reason"])

    def test_invalid_parameter_name_is_blocked_not_renamed(self):
        result = convert(
            """
            #!name = x
            [Argument]
            参数一 = input,"v",tag=名称
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("参数名", result["blocked"][0]["reason"])

    def test_parameter_substitution_in_rule_value(self):
        data = load(
            """
            #!name = x
            [Argument]
            host = input,"ads.example.com",tag=域名
            [Rule]
            DOMAIN-SUFFIX,${host},REJECT
            """
        )
        self.assertEqual(data["rules"], ["DOMAIN-SUFFIX,${args.host},REJECT"])

    def test_parameterised_policy_is_blocked(self):
        """策略位不能参数化：Stash 的策略必须是内置名，参数化会让规则失效。"""

        result = convert(
            """
            #!name = x
            [Argument]
            target = select,"DIRECT","REJECT",tag=策略
            [Rule]
            DOMAIN-SUFFIX,ads.example.com,${target}
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("策略", result["blocked"][0]["reason"])

    def test_missing_parameter_declaration_is_reported(self):
        result = convert(
            """
            #!name = x
            [Argument]
            region = select,"CN","US",tag=地区
            [Script]
            response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\// then script("https://cdn.example.com/a.js", {${unknown}})
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("unknown", result["blocked"][0]["reason"])


class MitmTests(unittest.TestCase):
    def test_hostname_list_and_bare_lines(self):
        data = load(
            """
            #!name = x
            [Mitm]
            hostname = api.example.com, *.cdn.example.com
            -skip.example.com
            """
        )
        self.assertEqual(
            data["http"]["mitm"],
            ["api.example.com", "*.cdn.example.com", "-skip.example.com"],
        )


class UnsupportedSectionTests(unittest.TestCase):
    def test_host_general_ip_rewrite_are_blocked(self):
        result = convert(
            """
            #!name = x
            [Host]
            api.example.com = 192.0.2.10
            [General]
            include-tun = 10.7.0.1/32
            [IP Rewrite]
            10.7.0.1 = reflect
            """
        )
        reasons = " ".join(item["reason"] for item in result["blocked"])
        self.assertIn("[Host]", reasons)
        self.assertIn("[General]", reasons)
        self.assertIn("[IP Rewrite]", reasons)
        self.assertEqual(len(result["blocked"]), 3)

    def test_nothing_is_dropped_silently(self):
        """未知段落/未知行必须出现在 blocked 里，不能凭空消失。"""

        text = """
        #!name = x
        [Rewrite]
        ^https://a\\.example\\.com/1 - reject
        ^https://a\\.example\\.com/2 mystery-action
        [Whatever]
        key = value
        """
        result = convert(text)
        self.assertEqual(len(result["blocked"]), 2)
        lines = sorted(item["line"] for item in result["blocked"])
        self.assertEqual(lines, [4, 6])
        self.assertIn("reject", result["yaml"])


class LoonFlagAndRejectSemanticsTests(unittest.TestCase):
    """/i 标志与 reject 状态码语义（Loon reject(200) 必须变成 Stash reject-200）。"""

    def test_case_insensitive_flag_becomes_inline_prefix(self):
        data = load(
            r"""
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https?:\/\/api\.example\.com\/ad(\?|$)/i then response.header.del("X-Ad")
            """
        )
        entry = data["http"]["header-rewrite"][0]
        self.assertTrue(entry.startswith(r"(?i)^https?:\/\/api\.example\.com\/ad"), entry)

    def test_flag_on_script_match(self):
        data = load(
            r"""
            #!name = x
            [Script]
            request if ${url} ~= /^https?:\/\/api\.example\.com\/x/i then script("https://cdn.example.com/a.js")
            """
        )
        self.assertTrue(data["http"]["script"][0]["match"].startswith("(?i)^"))

    def test_reject_semantics_trio(self):
        data = load(
            r"""
            #!name = x
            [Rewrite]
            request if ${url} ~= /^https:\/\/a\.example\.com\/bare/ then reject()
            request if ${url} ~= /^https:\/\/a\.example\.com\/ok/ then reject(200)
            request if ${url} ~= /^https:\/\/a\.example\.com\/404/ then reject(404)
            request if ${url} ~= /^https:\/\/a\.example\.com\/dict/ then reject_dict(200)
            request if ${url} ~= /^https:\/\/a\.example\.com\/arr/ then reject_array(200)
            """
        )
        entries = data["http"]["url-rewrite"]
        by_path = {e.split("/")[-1]: e for e in entries}
        # 裸 reject 保留「断连/404」语义，不能升级成 200
        self.assertTrue(by_path["bare - reject"].endswith("- reject"))
        # Loon reject(200) → Stash reject-200，不能变成 reject(404)
        self.assertTrue(by_path["ok - reject-200"].endswith("- reject-200"))
        self.assertTrue(by_path["404 - reject"].endswith("- reject"))
        self.assertTrue(by_path["dict - reject-dict"].endswith("- reject-dict"))
        self.assertTrue(by_path["arr - reject-array"].endswith("- reject-array"))

    def test_json_jq_with_quoted_string_argument(self):
        data = load(
            r"""
            #!name = x
            [Rewrite]
            response if ${url} ~= /^https:\/\/api\.example\.com\/cfg/ then response.json.jq(".data.ads = [] | .data.name = \"Stash\"")
            """
        )
        entry = data["http"]["body-rewrite"][0]
        self.assertIn('response-jq .data.ads = [] | .data.name = "Stash"', entry)

    def test_script_with_tag_and_timeout(self):
        result = convert(
            r"""
            #!name = x
            [Script]
            response if ${url} ~= /^https:\/\/api\.example\.com\/u/ then script("https://cdn.example.com/u.js") with tag="[x]User", timeout=12
            """
        )
        data = yaml.safe_load(result["yaml"])
        self.assertEqual(data["http"]["script"][0]["timeout"], 12)
        self.assertEqual(result["blocked"], [])
        self.assertEqual(result["degraded"], [])
        self.assertTrue(any("tag" in w for w in result["warnings"]))

    def test_param_guard_in_condition_is_blocked(self):
        """${enabled} 这类参数 guard 无法在 Stash 表达，必须 blocked 而不是降级。"""

        result = convert(
            r"""
            #!name = x
            [Argument]
            enabled = switch,true,tag=启用
            [Script]
            response if ${url} ~= /^https:\/\/api\.example\.com\/u/ && ${enabled} then script("https://cdn.example.com/u.js")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("enabled", result["blocked"][0]["reason"])

    def test_param_guard_in_rewrite_is_blocked(self):
        result = convert(
            r"""
            #!name = x
            [Argument]
            enabled = switch,true,tag=启用
            [Rewrite]
            response if ${url} ~= /^https:\/\/api\.example\.com\/u/ && ${enabled} then response.header.del("X-Ad")
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("enabled", result["blocked"][0]["reason"])

    def test_enable_parameter_binding_is_blocked(self):
        result = convert(
            r"""
            #!name = x
            [Argument]
            enabled = switch,true,tag=启用
            [Script]
            response if ${url} ~= /^https:\/\/api\.example\.com\/u/ then script("https://cdn.example.com/u.js") with enable=${enabled}
            """
        )
        self.assertEqual(len(result["blocked"]), 1)
        self.assertIn("enable", result["blocked"][0]["reason"])


class StrictModeTests(unittest.TestCase):
    def test_strict_raises_on_blocked(self):
        with self.assertRaises(L.UnsupportedError) as ctx:
            L.convert_or_raise(
                textwrap.dedent(
                    """
                    #!name = x
                    [Rule]
                    SOCKSRULE,a.example.com,REJECT
                    """
                ).strip()
                + "\n"
            )
        error = ctx.exception
        self.assertEqual(len(error.blocked), 1)
        self.assertEqual(error.blocked[0].line, 3)
        self.assertIn("SOCKSRULE", str(error))

    def test_strict_raises_on_degraded(self):
        with self.assertRaises(L.UnsupportedError):
            L.convert_or_raise(
                textwrap.dedent(
                    """
                    #!name = x
                    [Rewrite]
                    response if ${url} ~= /^https:\\/\\/a\\.example\\.com\\/x/ && ${response.status} == 200 then response.header.del("X-Ad")
                    """
                ).strip()
                + "\n"
            )

    def test_clean_input_passes_strict(self):
        yaml_text = L.convert_or_raise(
            textwrap.dedent(
                """
                #!name = 干净插件
                [Rule]
                DOMAIN-SUFFIX,ads.example.com,REJECT
                [Rewrite]
                ^https://ads\\.example\\.com/x - reject-dict
                """
            ).strip()
            + "\n"
        )
        data = yaml.safe_load(yaml_text)
        self.assertEqual(data["name"], "干净插件")
        self.assertEqual(data["rules"], ["DOMAIN-SUFFIX,ads.example.com,REJECT"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
